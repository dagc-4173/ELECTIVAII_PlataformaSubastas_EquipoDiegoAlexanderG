import { createHmac } from "node:crypto";
import request from "supertest";
import { afterEach, expect, it, vi } from "vitest";
import { createApp } from "../../../src/infrastructure/createApp.js";

const secret = "payment-webhook-test-secret-at-least-32";
const publishedAt = new Date("2026-11-11T12:00:00.000Z");
const closesAt = new Date("2026-11-11T13:00:00.000Z");
let close: (() => void) | undefined;

afterEach(() => {
  close?.();
  close = undefined;
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

async function fixture() {
  vi.stubEnv("JWT_SECRET", "payment-webhook-test-jwt-secret-at-least-32");
  vi.stubEnv("JWT_EXPIRES_IN_SECONDS", "7200");
  vi.stubEnv("PAYMENT_WEBHOOK_SECRET", secret);
  vi.setSystemTime(publishedAt);
  const runtime = createApp(":memory:");
  close = runtime.close;
  const http = request(runtime.app);
  const password = "test-password";
  async function createUser(id: string): Promise<string> {
    const email = `${id}@example.test`;
    await http.post("/users").send({ userId: id, name: id, email, password }).expect(201);
    const login = await http.post("/auth/login").send({ email, password }).expect(200);
    return login.body.accessToken;
  }
  const seller = await createUser("seller");
  const bidder = await createUser("bidder");
  await http.post("/auctions").set("Authorization", `Bearer ${seller}`).send({
    auctionId: "auction-1", itemId: "item-1", categoryId: "category-1",
    basePrice: 10000, minimumIncrement: 1000,
    publishedAt: publishedAt.toISOString(), closesAt: closesAt.toISOString(),
  }).expect(201);
  await http.post("/auctions/auction-1/bids").set("Authorization", `Bearer ${bidder}`).send({
    bidId: "bid-1", rejectedBidAttemptId: "rejected-1", amount: 10000,
  }).expect(201);
  vi.setSystemTime(closesAt);
  await http.get("/auctions/auction-1").set("Authorization", `Bearer ${bidder}`).expect(200);

  async function order() {
    const login = await http.post("/auth/login").send({ email: "bidder@example.test", password }).expect(200);
    const result = await http.get("/auctions/auction-1/payment-order")
      .set("Authorization", `Bearer ${login.body.accessToken}`).expect(200);
    return result.body;
  }

  function notify(body: string, signature = createHmac("sha256", secret).update(body).digest("hex")) {
    return http.post("/payments/webhook").type("json").set("X-Payment-Signature", signature).send(body);
  }

  const initialOrder = await order();
  function event(eventId: string, result = "SUCCESS") {
    return JSON.stringify({ eventId, paymentOrderId: initialOrder.id, result, occurredAt: new Date().toISOString() });
  }
  return { notify, event, order, dueAt: initialOrder.dueAt };
}

it("rejects an invalid signature without changing the order or consuming the event ID", async () => {
  const { notify, event, order } = await fixture();
  const body = event("event-1");
  await notify(body, "a".repeat(64)).expect(401);
  expect((await order()).status).toBe("PENDING");
  await notify(body).expect(200, { eventId: "event-1", outcome: "CONFIRMED" });
  expect((await order()).status).toBe("CONFIRMED");
});

it("returns the original result for repeated deliveries and rejects reuse with different data", async () => {
  const { notify, event, order } = await fixture();
  await notify(event("failed-1", "FAILED")).expect(200, { eventId: "failed-1", outcome: "FAILED" });
  expect((await order()).status).toBe("PENDING");
  const body = event("success-1");
  await Promise.all([
    notify(body).expect(200, { eventId: "success-1", outcome: "CONFIRMED" }),
    notify(body).expect(200, { eventId: "success-1", outcome: "CONFIRMED" }),
  ]);
  await notify(event("success-1", "FAILED")).expect(409);
  await notify(event("success-2")).expect(200, { eventId: "success-2", outcome: "ALREADY_CONFIRMED" });
  expect((await order()).status).toBe("CONFIRMED");
});

it("expires an overdue order when a late notification arrives", async () => {
  const { notify, event, order, dueAt } = await fixture();
  vi.setSystemTime(new Date(dueAt));
  await notify(event("late-1")).expect(200, { eventId: "late-1", outcome: "EXPIRED" });
  expect((await order()).status).toBe("EXPIRED");
});
