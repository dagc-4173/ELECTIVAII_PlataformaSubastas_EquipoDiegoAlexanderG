import type { Server } from "node:http";
import type { Duplex } from "node:stream";
import type { IncomingMessage } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import type { AuctionEvent, AuctionEventPublisher } from "../../application/ports/AuctionEventPublisher.js";
import type { TokenService } from "../../application/ports/TokenService.js";
import type { UserRepository } from "../../domain/ports/UserRepository.js";
import type { AuctionRepository } from "../../domain/ports/AuctionRepository.js";
import { UserId } from "../../domain/value-objects/UserId.js";
import { AuctionId } from "../../domain/value-objects/AuctionId.js";

type Session = {
  socket: WebSocket;
  userId?: string;
  token?: string;
  subscriptions: Set<string>;
  alive: boolean;
};

export class WebSocketAuctionEventPublisher implements AuctionEventPublisher {
  private readonly wss = new WebSocketServer({ noServer: true, maxPayload: 16384, perMessageDeflate: false });
  private readonly sessions = new Set<Session>();
  private server: Server | undefined;
  private heartbeat: ReturnType<typeof setInterval> | undefined;

  constructor(
    private readonly tokens: TokenService,
    private readonly users: UserRepository,
    private readonly auctions: AuctionRepository,
  ) {
    this.wss.on("connection", (socket) => this.connected(socket));
  }

  attach(server: Server): void {
    if (this.server !== undefined) throw new Error("WebSocket server is already attached");
    this.server = server;
    server.on("upgrade", this.upgrade);
    this.heartbeat = setInterval(() => {
      for (const session of this.sessions) {
        if (!session.alive || (session.token !== undefined && this.tokens.verify(session.token) === null)) {
          session.socket.terminate();
          continue;
        }
        session.alive = false;
        session.socket.ping();
      }
    }, 30000);
    this.heartbeat.unref();
  }

  private upgrade = (request: IncomingMessage, socket: Duplex, head: Buffer): void => {
    const onError = (error: Error) => console.error("WebSocket upgrade error:", error);
    socket.once("error", onError);
    if (request.url !== "/ws") {
      socket.end("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
      return;
    }
    this.wss.handleUpgrade(request, socket, head, (client) => {
      socket.off("error", onError);
      this.wss.emit("connection", client, request);
    });
  };

  private connected(socket: WebSocket): void {
    const session: Session = { socket, subscriptions: new Set(), alive: true };
    this.sessions.add(session);
    let queue = Promise.resolve();
    const deadline = setTimeout(() => socket.close(1008, "Authentication required"), 5000);
    deadline.unref();
    socket.on("pong", () => { session.alive = true; });
    socket.on("error", (error) => console.error("WebSocket connection error:", error));
    socket.on("close", () => {
      clearTimeout(deadline);
      this.sessions.delete(session);
      for (const auctionId of session.subscriptions) this.publishParticipants(auctionId);
    });
    socket.on("message", (data, binary) => {
      queue = queue.then(async () => {
        if (socket.readyState !== WebSocket.OPEN) return;
        if (binary) { this.error(session, "INVALID_MESSAGE", "Send a JSON text message"); return; }
        let message: unknown;
        try { message = JSON.parse(data.toString()); }
        catch { this.error(session, "INVALID_MESSAGE", "Invalid JSON message"); return; }
        if (typeof message !== "object" || message === null || !("type" in message)) {
          this.error(session, "INVALID_MESSAGE", "Message type is required"); return;
        }
        if (message.type === "AUTHENTICATE") {
          if (session.userId !== undefined) { this.error(session, "ALREADY_AUTHENTICATED", "Reconnect to change authentication"); return; }
          const token = "accessToken" in message && typeof message.accessToken === "string" ? message.accessToken : "";
          const userId = this.tokens.verify(token);
          if (userId === null || await this.users.findById(UserId.create(userId)) === null) {
            this.error(session, "INVALID_TOKEN", "Invalid or expired authentication token"); socket.close(1008, "Invalid token"); return;
          }
          session.userId = userId;
          session.token = token;
          clearTimeout(deadline);
          this.send(session, { type: "AUTHENTICATED", userId });
          return;
        }
        if (session.token === undefined || this.tokens.verify(session.token) === null) {
          this.error(session, "AUTHENTICATION_REQUIRED", "Authenticate with a valid token first");
          socket.close(1008, "Authentication required"); return;
        }
        if (message.type !== "SUBSCRIBE" && message.type !== "UNSUBSCRIBE") {
          this.error(session, "INVALID_MESSAGE", "Unknown message type"); return;
        }
        if (!("auctionId" in message) || typeof message.auctionId !== "string" || message.auctionId.trim().length === 0) {
          this.error(session, "INVALID_MESSAGE", "Auction ID is required"); return;
        }
        if (message.type === "UNSUBSCRIBE") {
          session.subscriptions.delete(message.auctionId);
          this.send(session, { type: "UNSUBSCRIBED", auctionId: message.auctionId });
          this.publishParticipants(message.auctionId);
          return;
        }
        if (await this.users.findById(UserId.create(session.userId!)) === null) {
          this.error(session, "INVALID_TOKEN", "User is no longer registered"); socket.close(1008, "Invalid user"); return;
        }
        const auction = await this.auctions.findById(AuctionId.create(message.auctionId));
        if (auction === null) { this.error(session, "AUCTION_NOT_FOUND", "Auction not found"); return; }
        if (session.subscriptions.size >= 64 && !session.subscriptions.has(message.auctionId)) {
          this.error(session, "SUBSCRIPTION_LIMIT", "At most 64 auction subscriptions are allowed"); return;
        }
        session.subscriptions.add(message.auctionId);
        this.send(session, { type: "SUBSCRIBED", auctionId: message.auctionId });
        this.publishParticipants(message.auctionId);
      }).catch((error: unknown) => {
        console.error("WebSocket message error:", error);
        this.error(session, "INTERNAL_SERVER_ERROR", "Unexpected server error");
      });
    });
  }

  publish(event: AuctionEvent): void {
    for (const session of this.sessions) {
      if (session.token === undefined || session.userId === undefined) continue;
      if (this.tokens.verify(session.token) === null) { session.socket.close(1008, "Token expired"); continue; }
      if (event.type === "BID_OUTBID") {
        if (session.userId === event.recipientId) this.send(session, event);
      } else if (event.type === "PAYMENT_UPDATED" && event.recipientId !== undefined) {
        if (session.userId === event.recipientId && session.subscriptions.has(event.auctionId)) {
          this.send(session, { type: event.type, auctionId: event.auctionId });
        }
      } else {
        if (session.subscriptions.has(event.auctionId)) this.send(session, event);
        if (event.type === "AUCTION_CLOSED" && (session.userId === event.winnerId || session.userId === event.sellerId)) {
          this.send(session, { ...event, type: "AUCTION_RESULT", recipientId: session.userId });
        }
      }
    }
  }

  private publishParticipants(auctionId: string): void {
    const subscribed = [...this.sessions].filter((session) =>
      session.socket.readyState === WebSocket.OPEN && session.subscriptions.has(auctionId)
      && session.token !== undefined && this.tokens.verify(session.token) !== null,
    );
    const count = new Set(subscribed.map((session) => session.userId)).size;
    for (const session of subscribed) this.send(session, { type: "PARTICIPANT_COUNT", auctionId, count });
  }

  private error(session: Session, code: string, message: string): void {
    this.send(session, { type: "ERROR", error: { code, message } });
  }

  private send(session: Session, message: unknown): void {
    if (session.socket.readyState !== WebSocket.OPEN) return;
    if (session.socket.bufferedAmount > 1024 * 1024) { session.socket.close(1013, "Client is too slow"); return; }
    session.socket.send(JSON.stringify(message), (error) => {
      if (error) { console.error("WebSocket delivery error:", error); session.socket.terminate(); }
    });
  }

  async close(): Promise<void> {
    if (this.heartbeat !== undefined) clearInterval(this.heartbeat);
    this.server?.off("upgrade", this.upgrade);
    for (const session of this.sessions) session.socket.terminate();
    await new Promise<void>((resolve, reject) => this.wss.close((error) => error ? reject(error) : resolve()));
    this.sessions.clear();
  }
}
