import request from "supertest";
import type { Express } from "express";
import { beforeAll, afterAll, afterEach, describe, expect, it, vi } from "vitest";

let app: Express;
let closeDatabase: () => void;
const tokens: Record<string, string> = {};
let sequence = 0;

beforeAll(async () => {
  vi.stubEnv("JWT_SECRET", "payment-query-test-secret-0123456789abcdef");
  vi.stubEnv("JWT_EXPIRES_IN_SECONDS", "604800");
  const application = (await import("../../../src/infrastructure/createApp.js")).createApp(":memory:");
  app = application.app;
  closeDatabase = application.close;
  for (const id of ["payment-seller", "payment-winner", "payment-observer"]) {
    const registered = await request(app).post("/users").send({
      userId: id, name: id, email: `${id}@example.com`, password: "payment-query-password",
    });
    expect(registered.status).toBe(201);
    const login = await request(app).post("/auth/login").send({
      email: `${id}@example.com`, password: "payment-query-password",
    });
    expect(login.status).toBe(200);
    tokens[id] = login.body.accessToken;
  }
});
afterEach(() => vi.useRealTimers());
afterAll(() => { closeDatabase(); vi.unstubAllEnvs(); });

async function createAuction(withBid: boolean, close: boolean) {
  const auctionId = `payment-auction-${++sequence}`;
  const publishedAt = new Date();
  const closesAt = new Date(publishedAt.getTime() + 3600000);
  const published = await request(app).post("/auctions")
    .set("Authorization", `Bearer ${tokens["payment-seller"]}`)
    .send({ auctionId, itemId: "item", categoryId: "category", basePrice: 100000,
      minimumIncrement: 5000, publishedAt: publishedAt.toISOString(), closesAt: closesAt.toISOString() });
  expect(published.status).toBe(201);
  if (withBid) {
    const bid = await request(app).post(`/auctions/${auctionId}/bids`)
      .set("Authorization", `Bearer ${tokens["payment-winner"]}`)
      .send({ bidId: `bid-${sequence}`, amount: 100000, rejectedBidAttemptId: `rejected-${sequence}` });
    expect(bid.status).toBe(201);
  }
  if (close) {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(closesAt);
    const detail = await request(app).get(`/auctions/${auctionId}`)
      .set("Authorization", `Bearer ${tokens["payment-winner"]}`);
    expect(detail.status).toBe(200);
    expect(detail.body.status).toBe(withBid ? "CLOSED" : "DESERTED");
  }
  return auctionId;
}

describe("RF-17 payment order query", () => {
  it("returns the generated order to the winner and preserves it across repeated reads", async () => {
    const id = await createAuction(true, true);
    const response = await request(app).get(`/auctions/${id}/payment-order`)
      .set("Authorization", `Bearer ${tokens["payment-winner"]}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: expect.any(String), auctionId: id, winnerId: "payment-winner", amount: 100000,
      status: "PENDING", createdAt: expect.any(String), dueAt: expect.any(String),
    });
    expect(Date.parse(response.body.dueAt) - Date.parse(response.body.createdAt)).toBe(48 * 3600000);
    const repeated = await request(app).get(`/auctions/${id}/payment-order`)
      .set("Authorization", `Bearer ${tokens["payment-winner"]}`);
    expect(repeated.status).toBe(200);
    expect(repeated.body).toEqual(response.body);
  });

  it.each(["payment-seller", "payment-observer"])("denies order access to %s even with a forged query identity", async (userId) => {
    const id = await createAuction(true, true);
    const response = await request(app).get(`/auctions/${id}/payment-order?winnerId=payment-winner`)
      .set("Authorization", `Bearer ${tokens[userId]}`);
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN_OPERATION");
    expect(response.body).not.toHaveProperty("amount");
  });

  it.each([undefined, "Bearer invalid-token"])("rejects missing or invalid authentication: %s", async (authorization) => {
    const pending = request(app).get("/auctions/any-auction/payment-order");
    if (authorization) pending.set("Authorization", authorization);
    const response = await pending;
    expect(response.status).toBe(401);
  });

  it("returns 404 for an unknown auction", async () => {
    const response = await request(app).get("/auctions/missing-auction/payment-order")
      .set("Authorization", `Bearer ${tokens["payment-winner"]}`);
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("RESOURCE_NOT_FOUND");
  });

  it.each([[true, false], [false, true]])("returns 404 without an order (bid=%s, closed=%s)", async (withBid, close) => {
    const id = await createAuction(withBid, close);
    const response = await request(app).get(`/auctions/${id}/payment-order`)
      .set("Authorization", `Bearer ${tokens["payment-winner"]}`);
    expect(response.status).toBe(404);
    expect(response.body.error).toEqual({ code: "RESOURCE_NOT_FOUND", message: "Payment order not found" });
  });
});
