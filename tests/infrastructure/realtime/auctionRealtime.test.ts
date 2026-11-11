import { createServer } from "node:http";
import { createHmac } from "node:crypto";
import type { Server } from "node:http";
import { WebSocket } from "ws";
import request from "supertest";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../../src/infrastructure/createApp.js";

type Message = { type: string; auctionId?: string; recipientId?: string; amount?: number; winnerId?: string | null;
  status?: string; count?: number; error?: { code: string }; };
let application: ReturnType<typeof createApp>;
let server: Server;
let url: string;
let now: Date;
const tokens: Record<string, string> = {};
const clients: WebSocket[] = [];
const paymentSecret = "realtime-payment-test-secret-0123456789";

async function client(userId?: string) {
  const socket = new WebSocket(url);
  clients.push(socket);
  const messages: Message[] = [];
  socket.on("message", (raw) => { messages.push(JSON.parse(raw.toString()) as Message); });
  await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
  const wait = (type: string, start = 0) => new Promise<Message>((resolve, reject) => {
    const found = messages.slice(start).find((message) => message.type === type);
    if (found) { resolve(found); return; }
    const timer = setTimeout(() => { socket.off("message", listener); reject(new Error(`Missing ${type}`)); }, 2000);
    const listener = () => {
      const message = messages.slice(start).find((entry) => entry.type === type);
      if (!message) return;
      clearTimeout(timer); socket.off("message", listener); resolve(message);
    };
    socket.on("message", listener);
  });
  const send = (message: object) => socket.send(JSON.stringify(message));
  const subscribe = async (auctionId = "auction-a") => {
    const start = messages.length;
    send({ type: "SUBSCRIBE", auctionId }); await wait("SUBSCRIBED", start);
  };
  const barrier = async () => {
    const start = messages.length;
    send({ type: "UNKNOWN" }); await wait("ERROR", start);
  };
  if (userId) { send({ type: "AUTHENTICATE", accessToken: tokens[userId] }); await wait("AUTHENTICATED"); }
  return { socket, messages, wait, send, subscribe, barrier };
}

async function bid(userId: string, amount: number, id: string) {
  return request(application.app).post("/auctions/auction-a/bids")
    .set("Authorization", `Bearer ${tokens[userId]}`)
    .send({ bidId: id, amount, rejectedBidAttemptId: `rejected-${id}` });
}

beforeEach(async () => {
  vi.stubEnv("JWT_SECRET", "realtime-integration-secret-0123456789abcdef");
  vi.stubEnv("JWT_EXPIRES_IN_SECONDS", "7200");
  vi.stubEnv("PAYMENT_WEBHOOK_SECRET", paymentSecret);
  application = createApp(":memory:");
  server = createServer(application.app);
  application.realtime.attach(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Missing server port");
  url = `ws://127.0.0.1:${address.port}/ws`;
  for (const userId of ["seller", "first", "second", "observer"]) {
    const registered = await request(application.app).post("/users").send({
      userId, name: userId, email: `${userId}@example.com`, password: "realtime-test-password",
    });
    expect(registered.status).toBe(201);
    const login = await request(application.app).post("/auth/login").send({ email: `${userId}@example.com`, password: "realtime-test-password" });
    expect(login.status).toBe(200);
    tokens[userId] = login.body.accessToken;
  }
  now = new Date();
  for (const auctionId of ["auction-a", "auction-b"]) {
    const publication = await request(application.app).post("/auctions")
      .set("Authorization", `Bearer ${tokens.seller}`)
      .send({ auctionId, itemId: "item", categoryId: "category", basePrice: 100, minimumIncrement: 10,
        publishedAt: now.toISOString(), closesAt: new Date(now.getTime() + 3600000).toISOString() });
    expect(publication.status).toBe(201);
  }
});

afterEach(async () => {
  vi.useRealTimers();
  for (const socket of clients.splice(0)) socket.terminate();
  await application.realtime.close();
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  application.close();
  vi.unstubAllEnvs();
});

describe("RF-12–15 WebSocket auction updates", () => {
  it("lists open auctions first in both profile activity views", async () => {
    await bid("first", 100, "first-activity-bid");
    const closingTime = new Date(now.getTime() + 3600000);
    vi.setSystemTime(closingTime);
    expect(application.closeDueAuctions.execute()).toBe(2);
    await request(application.app).post("/auctions")
      .set("Authorization", `Bearer ${tokens.seller}`)
      .send({
        auctionId: "open-activity", itemId: "item", categoryId: "category", basePrice: 100,
        minimumIncrement: 10, publishedAt: closingTime.toISOString(),
        closesAt: new Date(closingTime.getTime() + 3600000).toISOString(),
      }).expect(201);
    await request(application.app).post("/auctions/open-activity/bids")
      .set("Authorization", `Bearer ${tokens.first}`)
      .send({ bidId: "open-activity-bid", amount: 100, rejectedBidAttemptId: "open-activity-rejection" })
      .expect(201);

    const seller = await request(application.app).get("/users/me")
      .set("Authorization", `Bearer ${tokens.seller}`).expect(200);
    const bidder = await request(application.app).get("/users/me")
      .set("Authorization", `Bearer ${tokens.first}`).expect(200);
    expect(seller.body.publishedAuctions.map((auction: { id: string }) => auction.id))
      .toEqual(["open-activity", "auction-a", "auction-b"]);
    expect(bidder.body.participatedAuctions.map((auction: { id: string }) => auction.id))
      .toEqual(["open-activity", "auction-a"]);
  });

  it("accepts only one of two simultaneous bids of the same amount", async () => {
    const observer = await client("observer");
    await observer.subscribe();
    const responses = await Promise.all([bid("first", 100, "equal-first"), bid("second", 100, "equal-second")]);
    expect(responses.filter((response) => response.status === 201)).toHaveLength(1);
    const rejected = responses.find((response) => response.status !== 201)!;
    expect([400, 409]).toContain(rejected.status);
    expect(["BUSINESS_RULE_VIOLATION", "CONCURRENT_MODIFICATION"]).toContain(rejected.body.error.code);
    const detail = await request(application.app).get("/auctions/auction-a")
      .set("Authorization", `Bearer ${tokens.observer}`).expect(200);
    expect(detail.body.bids).toHaveLength(1);
    await observer.wait("BID_ACCEPTED");
    await observer.barrier();
    expect(observer.messages.filter((event) => event.type === "BID_ACCEPTED")).toHaveLength(1);
  });

  it("closes due auctions and shares payment confirmation with the seller and winner", async () => {
    const winner = await client("first");
    const seller = await client("seller");
    const observer = await client("observer");
    await winner.subscribe(); await seller.subscribe(); await observer.subscribe();
    await bid("first", 100, "winning-bid");
    vi.setSystemTime(new Date(now.getTime() + 3600000));
    expect(application.closeDueAuctions.execute()).toBe(2);
    expect(application.closeDueAuctions.execute()).toBe(0);
    expect(await winner.wait("AUCTION_CLOSED")).toMatchObject({ winnerId: "first", status: "CLOSED" });
    const publicList = await request(application.app).get("/auctions").expect(200);
    expect(publicList.body.items.map((auction: { status: string }) => auction.status)).toEqual(["CLOSED", "DESERTED"]);
    const order = await request(application.app).get("/auctions/auction-a/payment-order")
      .set("Authorization", `Bearer ${tokens.first}`).expect(200);
    const sellerDetail = () => request(application.app).get("/auctions/auction-a")
      .set("Authorization", `Bearer ${tokens.seller}`).expect(200);
    expect((await sellerDetail()).body.sellerPaymentStatus).toBe("PENDING");
    await request(application.app).get("/auctions/auction-a/payment-order")
      .set("Authorization", `Bearer ${tokens.seller}`).expect(403);
    const body = JSON.stringify({
      eventId: "live-payment", paymentOrderId: order.body.id, result: "SUCCESS", occurredAt: new Date().toISOString(),
    });
    const signature = createHmac("sha256", paymentSecret).update(body).digest("hex");
    for (const _delivery of [1, 2]) {
      await request(application.app).post("/payments/webhook").type("json")
        .set("X-Payment-Signature", signature).send(body).expect(200);
    }
    expect(await winner.wait("PAYMENT_UPDATED")).toEqual({ type: "PAYMENT_UPDATED", auctionId: "auction-a" });
    expect(await seller.wait("PAYMENT_UPDATED")).toEqual({ type: "PAYMENT_UPDATED", auctionId: "auction-a" });
    await winner.barrier(); await seller.barrier(); await observer.barrier();
    expect(winner.messages.filter((event) => event.type === "PAYMENT_UPDATED")).toHaveLength(1);
    expect(seller.messages.filter((event) => event.type === "PAYMENT_UPDATED")).toHaveLength(1);
    expect(observer.messages.some((event) => event.type === "PAYMENT_UPDATED")).toBe(false);
    expect((await sellerDetail()).body.sellerPaymentStatus).toBe("CONFIRMED");
    const otherDetail = await request(application.app).get("/auctions/auction-a")
      .set("Authorization", `Bearer ${tokens.observer}`).expect(200);
    expect(otherDetail.body).not.toHaveProperty("sellerPaymentStatus");
  });

  it("counts distinct subscribed accounts and updates the count on disconnect", async () => {
    const first = await client("first");
    await first.subscribe();
    expect(await first.wait("PARTICIPANT_COUNT")).toMatchObject({ count: 1 });
    const duplicate = await client("first");
    await duplicate.subscribe();
    expect(await duplicate.wait("PARTICIPANT_COUNT")).toMatchObject({ count: 1 });
    await first.barrier();
    let start = first.messages.length;
    const second = await client("second");
    await second.subscribe();
    expect(await first.wait("PARTICIPANT_COUNT", start)).toMatchObject({ count: 2 });
    start = first.messages.length;
    second.socket.close();
    expect(await first.wait("PARTICIPANT_COUNT", start)).toMatchObject({ count: 1 });
  });
  it("broadcasts accepted bids to both room clients and sends outbid only to the previous leader", async () => {
    const first = await client("first"); const second = await client("second"); const unrelated = await client("observer");
    await first.subscribe(); await second.subscribe(); await unrelated.subscribe("auction-b");
    expect((await bid("first", 100, "first-bid")).status).toBe(201);
    await first.wait("BID_ACCEPTED"); await second.wait("BID_ACCEPTED");
    const start = first.messages.length;
    expect((await bid("second", 110, "second-bid")).status).toBe(201);
    expect(await first.wait("BID_OUTBID", start)).toMatchObject({ recipientId: "first", amount: 110 });
    await first.barrier(); await second.barrier(); await unrelated.barrier();
    expect(first.messages.filter((message) => message.type === "BID_ACCEPTED").map((message) => message.amount)).toEqual([100, 110]);
    expect(second.messages.filter((message) => message.type === "BID_ACCEPTED")).toHaveLength(2);
    expect(second.messages.some((message) => message.type === "BID_OUTBID")).toBe(false);
    expect(unrelated.messages.some((message) => message.type === "BID_ACCEPTED" || message.type === "BID_OUTBID")).toBe(false);
  });

  it("does not broadcast rejected bids and stops room delivery after unsubscribe", async () => {
    const listener = await client("observer"); await listener.subscribe(); await listener.subscribe();
    expect((await bid("first", 1, "too-low")).status).toBe(400);
    await listener.barrier();
    expect(listener.messages.some((message) => message.type === "BID_ACCEPTED")).toBe(false);
    listener.send({ type: "UNSUBSCRIBE", auctionId: "auction-a" }); await listener.wait("UNSUBSCRIBED");
    expect((await bid("first", 100, "accepted")).status).toBe(201);
    await listener.barrier();
    expect(listener.messages.some((message) => message.type === "BID_ACCEPTED")).toBe(false);
  });

  it("announces lazy close once, broadcasts the winner and privately notifies winner and seller", async () => {
    const winner = await client("first"); const observer = await client("observer"); const seller = await client("seller");
    await winner.subscribe(); await observer.subscribe();
    expect((await bid("first", 100, "winning-bid")).status).toBe(201);
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(now.getTime() + 3600000));
    const detail = () => request(application.app).get("/auctions/auction-a").set("Authorization", `Bearer ${tokens.first}`);
    expect((await detail()).status).toBe(200);
    expect(await observer.wait("AUCTION_CLOSED")).toMatchObject({ status: "CLOSED", winnerId: "first", amount: 100 });
    await winner.wait("AUCTION_RESULT"); await seller.wait("AUCTION_RESULT");
    expect((await detail()).status).toBe(200);
    await observer.barrier();
    expect(observer.messages.filter((message) => message.type === "AUCTION_CLOSED")).toHaveLength(1);
    expect(observer.messages.some((message) => message.type === "AUCTION_RESULT")).toBe(false);
    const order = await request(application.app).get("/auctions/auction-a/payment-order").set("Authorization", `Bearer ${tokens.first}`);
    expect(order.status).toBe(200);
  });

  it("broadcasts deserted closure when an expired auction receives a bid", async () => {
    const observer = await client("observer"); await observer.subscribe();
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(now.getTime() + 3600000));
    expect((await bid("first", 100, "late-bid")).status).toBe(400);
    expect(await observer.wait("AUCTION_CLOSED")).toMatchObject({ status: "DESERTED", winnerId: null, amount: null });
    await observer.barrier();
    expect(observer.messages.some((message) => message.type === "BID_ACCEPTED")).toBe(false);
  });

  it("rejects unauthenticated subscriptions and invalid tokens", async () => {
    const anonymous = await client();
    anonymous.send({ type: "SUBSCRIBE", auctionId: "auction-a" });
    expect((await anonymous.wait("ERROR")).error?.code).toBe("AUTHENTICATION_REQUIRED");
    const invalid = await client();
    invalid.send({ type: "AUTHENTICATE", accessToken: "invalid" });
    expect((await invalid.wait("ERROR")).error?.code).toBe("INVALID_TOKEN");
  });

  it("rejects invalid JSON and subscriptions to nonexistent auctions", async () => {
    const observer = await client("observer");
    observer.socket.send("not JSON");
    expect((await observer.wait("ERROR")).error?.code).toBe("INVALID_MESSAGE");
    const start = observer.messages.length;
    observer.send({ type: "SUBSCRIBE", auctionId: "missing" });
    expect((await observer.wait("ERROR", start)).error?.code).toBe("AUCTION_NOT_FOUND");
  });

  it("does not deliver events after JWT expiration", async () => {
    const observer = await client("observer"); await observer.subscribe();
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(now.getTime() + 7201000));
    const closed = new Promise<void>((resolve) => observer.socket.once("close", () => resolve()));
    application.realtime.publish({ type: "BID_ACCEPTED", auctionId: "auction-a", bidId: "event", bidderId: "first", amount: 100, placedAt: now.toISOString() });
    await closed;
    expect(observer.messages.some((message) => message.type === "BID_ACCEPTED")).toBe(false);
  });
});
