import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const phase = process.argv[2];
if (!phase) {
  const directory = mkdtempSync(join(tmpdir(), "auction-process-restart-"));
  try {
    for (const current of ["seed", "verify"]) {
      const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), current], {
        cwd: process.cwd(), encoding: "utf8",
        env: { ...process.env, DATABASE_PATH: join(directory, "restart.sqlite"),
          JWT_SECRET: "process-restart-test-secret-0123456789abcdef", JWT_EXPIRES_IN_SECONDS: "3600" },
      });
      if (result.status !== 0) throw new Error(result.stderr || result.stdout || String(result.error));
    }
    console.log("Persistence verified across two independent Node processes: login, profile, bid history and payment order.");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
} else if (phase === "seed") {
  const { openDatabase } = await import("../dist/infrastructure/persistence/sqlite/SqliteDatabase.js");
  const { SqliteUserRepository } = await import("../dist/infrastructure/persistence/sqlite/SqliteUserRepository.js");
  const { SqliteAuctionRepository } = await import("../dist/infrastructure/persistence/sqlite/SqliteAuctionRepository.js");
  const { RegisterUserUseCase } = await import("../dist/application/use-cases/RegisterUserUseCase.js");
  const { ScryptPasswordHasher } = await import("../dist/infrastructure/security/ScryptPasswordHasher.js");
  const { Auction } = await import("../dist/domain/entities/Auction.js");
  const { Bid } = await import("../dist/domain/entities/Bid.js");
  const value = async (name) => (await import(`../dist/domain/value-objects/${name}.js`))[name];
  const [AuctionId, UserId, ItemId, CategoryId, Money, AuctionPublicationData, BidId, RejectedBidAttemptId, PaymentOrderId] =
    await Promise.all(["AuctionId", "UserId", "ItemId", "CategoryId", "Money", "AuctionPublicationData", "BidId", "RejectedBidAttemptId", "PaymentOrderId"].map(value));
  const db = openDatabase(process.env.DATABASE_PATH);
  try {
    const register = new RegisterUserUseCase(new SqliteUserRepository(db), new ScryptPasswordHasher());
    for (const userId of ["seller", "winner"]) await register.execute({ userId, name: userId, email: `${userId}@example.com`, password: "restart-test-password" });
    const auction = Auction.publish(AuctionId.create("restart-auction"), UserId.create("seller"), ItemId.create("item"), CategoryId.create("category"),
      AuctionPublicationData.create(Money.create(100), Money.create(10), new Date("2026-01-01T00:00:00Z"), new Date("2026-01-02T00:00:00Z")));
    try {
      auction.placeBid(Bid.create(BidId.create("rejected-bid"), UserId.create("winner"), Money.create(1), new Date("2026-01-01T01:00:00Z")), RejectedBidAttemptId.create("rejected"));
    } catch (error) {
      assert.equal(error.message, "First bid must be greater than or equal to base price");
    }
    auction.placeBid(Bid.create(BidId.create("winning-bid"), UserId.create("winner"), Money.create(100), new Date("2026-01-01T02:00:00Z")), RejectedBidAttemptId.create("unused"));
    auction.close(new Date("2026-01-02T00:00:00Z"), PaymentOrderId.create("restart-order"));
    await new SqliteAuctionRepository(db).save(auction);
  } finally { db.close(); }
} else if (phase === "verify") {
  const { default: request } = await import("supertest");
  const { createApp } = await import("../dist/infrastructure/createApp.js");
  const { app, close } = createApp();
  try {
    const login = await request(app).post("/auth/login").send({ email: "winner@example.com", password: "restart-test-password" });
    assert.equal(login.status, 200);
    const authorization = `Bearer ${login.body.accessToken}`;
    const profile = await request(app).get("/users/me").set("Authorization", authorization);
    assert.equal(profile.status, 200);
    assert.equal(profile.body.participatedAuctions[0].id, "restart-auction");
    const detail = await request(app).get("/auctions/restart-auction").set("Authorization", authorization);
    assert.equal(detail.status, 200);
    assert.equal(detail.body.status, "CLOSED");
    assert.equal(detail.body.bids[0].id, "winning-bid");
    assert.equal(detail.body.rejectedBidAttempts[0].id, "rejected");
    const order = await request(app).get("/auctions/restart-auction/payment-order").set("Authorization", authorization);
    assert.equal(order.status, 200);
    assert.equal(order.body.id, "restart-order");
    assert.equal(order.body.amount, 100);
    const duplicate = await request(app).post("/users").send({ userId: "other", name: "Other", email: "winner@example.com", password: "another-password" });
    assert.equal(duplicate.status, 400);
  } finally { close(); }
} else throw new Error("Unknown verification phase");
