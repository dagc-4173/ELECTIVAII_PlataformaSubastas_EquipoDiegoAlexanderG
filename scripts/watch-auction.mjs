import "dotenv/config";
import { WebSocket } from "ws";

const auctionId = process.argv[2];
const token = process.env.AUCTION_TOKEN;
if (!auctionId || !token) {
  console.error("Set AUCTION_TOKEN to a login JWT, then run: npm run watch:auction -- <auctionId>");
  process.exitCode = 1;
} else {
  const url = process.env.WEBSOCKET_URL ?? `ws://localhost:${process.env.PORT ?? "3000"}/ws`;
  const socket = new WebSocket(url);
  socket.on("open", () => socket.send(JSON.stringify({ type: "AUTHENTICATE", accessToken: token })));
  socket.on("message", (raw) => {
    const message = JSON.parse(raw.toString());
    console.log(JSON.stringify(message));
    if (message.type === "AUTHENTICATED") socket.send(JSON.stringify({ type: "SUBSCRIBE", auctionId }));
    if (message.type === "ERROR") process.exitCode = 1;
  });
  socket.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
  socket.on("close", (code, reason) => console.log(`Disconnected: ${code} ${reason.toString()}`));
  process.once("SIGINT", () => {
    if (socket.readyState === WebSocket.OPEN) socket.close(1000, "Client exit");
    else socket.terminate();
  });
}
