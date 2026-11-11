import { createServer } from "node:http";
import { app, closeDatabase, realtime, expirePendingPayments } from "./infrastructure/app.js";

const port = Number(process.env.PORT ?? 3000);
const server = createServer(app);
realtime.attach(server);

function checkPaymentDeadlines() {
  try {
    const expired = expirePendingPayments.execute();
    if (expired > 0) console.log(`Expired payment orders: ${expired}`);
  } catch (error) {
    console.error("Payment deadline check failed:", error);
  }
}

checkPaymentDeadlines();
const paymentTimer = setInterval(checkPaymentDeadlines, 30_000).unref();
server.listen(port, () => console.log(`Server running on port ${port}`));
let stopping = false;
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    if (stopping) return;
    stopping = true;
    clearInterval(paymentTimer);
    void realtime.close().catch((error: unknown) => console.error("WebSocket shutdown error:", error));
    server.close(() => { closeDatabase(); });
  });
}
