import request from "supertest";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import type { Express } from "express";

let app: Express;
let closeDatabase: () => void;
const tokens: Record<string, string> = {};

beforeAll(async () => {
  vi.stubEnv("JWT_SECRET", "profile-integration-test-secret-0123456789");
  vi.stubEnv("JWT_EXPIRES_IN_SECONDS", "3600");
  const application = (await import("../../../src/infrastructure/createApp.js")).createApp(":memory:");
  app = application.app;
  closeDatabase = application.close;
  for (const id of ["profile-seller", "profile-bidder", "profile-observer"]) {
    const registration = await request(app).post("/users").send({
      userId: id, name: id, email: `${id}@example.com`, password: "profile-test-password",
    });
    expect(registration.status).toBe(201);
    const login = await request(app).post("/auth/login").send({
      email: `${id}@example.com`, password: "profile-test-password",
    });
    expect(login.status).toBe(200);
    tokens[id] = login.body.accessToken;
  }
  for (const id of ["profile-auction", "unrelated-auction"]) {
    const publishedAt = new Date();
    const publication = await request(app).post("/auctions")
      .set("Authorization", `Bearer ${tokens["profile-seller"]}`)
      .send({ auctionId: id, itemId: "item", categoryId: "category", basePrice: 100,
        minimumIncrement: 10, publishedAt: publishedAt.toISOString(),
        closesAt: new Date(publishedAt.getTime() + 86400000).toISOString() });
    expect(publication.status).toBe(201);
  }
  const bid = await request(app).post("/auctions/profile-auction/bids")
    .set("Authorization", `Bearer ${tokens["profile-bidder"]}`)
    .send({ bidId: "profile-bid", amount: 100, rejectedBidAttemptId: "profile-rejected" });
  expect(bid.status).toBe(201);
  const rejected = await request(app).post("/auctions/unrelated-auction/bids")
    .set("Authorization", `Bearer ${tokens["profile-observer"]}`)
    .send({ bidId: "low-bid", amount: 1, rejectedBidAttemptId: "low-rejected" });
  expect(rejected.status).toBe(400);
});

afterAll(() => { closeDatabase(); vi.unstubAllEnvs(); });

describe("RF-03 authenticated profile", () => {
  it("returns the seller profile and published auctions without password data", async () => {
    const response = await request(app).get("/users/me")
      .set("Authorization", `Bearer ${tokens["profile-seller"]}`);
    expect(response.status).toBe(200);
    expect(Object.keys(response.body).sort()).toEqual(
      ["id", "name", "email", "publishedAuctions", "participatedAuctions"].sort(),
    );
    expect(response.body.id).toBe("profile-seller");
    expect(response.body.email).toBe("profile-seller@example.com");
    expect(response.body.publishedAuctions.map((auction: { id: string }) => auction.id))
      .toEqual(["profile-auction", "unrelated-auction"]);
    expect(response.body.participatedAuctions).toEqual([]);
    expect(JSON.stringify(response.body)).not.toMatch(/password|scrypt/i);
  });

  it("uses JWT identity and includes only auctions with an accepted bid", async () => {
    const response = await request(app).get("/users/me?userId=profile-seller")
      .set("Authorization", `Bearer ${tokens["profile-bidder"]}`);
    expect(response.status).toBe(200);
    expect(response.body.id).toBe("profile-bidder");
    expect(response.body.publishedAuctions).toEqual([]);
    expect(response.body.participatedAuctions.map((auction: { id: string }) => auction.id))
      .toEqual(["profile-auction"]);
    expect(JSON.stringify(response.body)).not.toContain("profile-seller@example.com");
  });

  it("returns empty activity for a user with only rejected bids", async () => {
    const response = await request(app).get("/users/me")
      .set("Authorization", `Bearer ${tokens["profile-observer"]}`);
    expect(response.status).toBe(200);
    expect(response.body.publishedAuctions).toEqual([]);
    expect(response.body.participatedAuctions).toEqual([]);
  });

  it.each([undefined, "Bearer invalid-token"])("rejects missing or invalid authentication: %s", async (authorization) => {
    const pending = request(app).get("/users/me");
    if (authorization) pending.set("Authorization", authorization);
    const response = await pending;
    expect(response.status).toBe(401);
    expect(response.body).not.toHaveProperty("email");
  });
});
