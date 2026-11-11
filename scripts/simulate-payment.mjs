import "dotenv/config";
import { createHmac, randomUUID } from "node:crypto";

const [paymentOrderId, result = "SUCCESS"] = process.argv.slice(2);
const secret = process.env.PAYMENT_WEBHOOK_SECRET;
if (!paymentOrderId || !["SUCCESS", "FAILED"].includes(result) || !secret || secret.length < 32) {
  console.error("Uso: node scripts/simulate-payment.mjs <id-orden> [SUCCESS|FAILED]. Configura PAYMENT_WEBHOOK_SECRET.");
  process.exit(1);
}

const payload = JSON.stringify({
  eventId: randomUUID(),
  paymentOrderId,
  result,
  occurredAt: new Date().toISOString(),
});
const signature = createHmac("sha256", secret).update(payload).digest("hex");
const url = `http://localhost:${process.env.PORT ?? 3000}/payments/webhook`;

async function send() {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Payment-Signature": signature },
    body: payload,
    signal: AbortSignal.timeout(5000),
  });
  return { status: response.status, body: await response.text() };
}

const first = await send();
const replay = await send();
console.log("Entrega inicial", first.status, first.body);
console.log("Reenvío", replay.status, replay.body);
if (first.status !== 200 || first.status !== replay.status || first.body !== replay.body) {
  process.exitCode = 1;
}
