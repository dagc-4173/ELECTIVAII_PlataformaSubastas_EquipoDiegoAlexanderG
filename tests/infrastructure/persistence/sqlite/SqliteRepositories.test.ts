import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { openDatabase } from "../../../../src/infrastructure/persistence/sqlite/SqliteDatabase.js";
import { SqliteAuctionRepository } from "../../../../src/infrastructure/persistence/sqlite/SqliteAuctionRepository.js";
import { SqliteUserRepository } from "../../../../src/infrastructure/persistence/sqlite/SqliteUserRepository.js";
import { Auction } from "../../../../src/domain/entities/Auction.js";
import { User } from "../../../../src/domain/entities/User.js";
import { Bid } from "../../../../src/domain/entities/Bid.js";
import { AuctionId } from "../../../../src/domain/value-objects/AuctionId.js";
import { AuctionPublicationData } from "../../../../src/domain/value-objects/AuctionPublicationData.js";
import { UserId } from "../../../../src/domain/value-objects/UserId.js";
import { ItemId } from "../../../../src/domain/value-objects/ItemId.js";
import { CategoryId } from "../../../../src/domain/value-objects/CategoryId.js";
import { Money } from "../../../../src/domain/value-objects/Money.js";
import { Email } from "../../../../src/domain/value-objects/Email.js";
import { BidId } from "../../../../src/domain/value-objects/BidId.js";
import { PaymentOrderId } from "../../../../src/domain/value-objects/PaymentOrderId.js";
import { RejectedBidAttemptId } from "../../../../src/domain/value-objects/RejectedBidAttemptId.js";
import { serializeAuction } from "../../../../src/infrastructure/persistence/sqlite/AuctionDocument.js";

let directory: string;
let db: DatabaseSync;
function reopen() {
  db.close();
  db = openDatabase(join(directory, "nested", "test.sqlite"));
  return new SqliteAuctionRepository(db);
}
function auction() {
  return Auction.publish(AuctionId.create("auction"), UserId.create("seller"), ItemId.create("item"), CategoryId.create("category"),
    AuctionPublicationData.create(Money.create(100), Money.create(10), new Date("2026-01-01T00:00:00Z"), new Date("2026-01-02T00:00:00Z")));
}
function bid(id = "bid", bidder = "bidder", amount = 100) {
  return Bid.create(BidId.create(id), UserId.create(bidder), Money.create(amount), new Date("2026-01-01T01:00:00Z"));
}
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "auction-sqlite-"));
  db = openDatabase(join(directory, "nested", "test.sqlite"));
});
afterEach(() => { db.close(); rmSync(directory, { recursive: true, force: true }); });

describe("SQLite durable repositories", () => {
  it("restores users and normalized unique email across connections", async () => {
    const users = new SqliteUserRepository(db);
    const original = User.create(UserId.create("user"), "User", Email.create("USER@example.com"), "salt:password-hash");
    await users.save(original);
    reopen();
    const restored = new SqliteUserRepository(db);
    const user = await restored.findByEmail(Email.create("User@EXAMPLE.com"));
    expect(user?.hashedPassword).toBe(original.hashedPassword);
    expect(user?.id.value).toBe("user");
    await expect(restored.save(User.create(UserId.create("other"), "Other", Email.create("user@example.com"), "other-hash")))
      .rejects.toThrow("Email is already registered");
    expect((await restored.findById(UserId.create("user")))?.name).toBe("User");
    expect(await restored.findById(UserId.create("missing"))).toBeNull();
  });

  it.each(["OPEN", "CLOSED", "CANCELLED", "DESERTED", "DEFAULTED", "CONFIRMED"])("preserves complete aggregate state: %s", async (state) => {
    const value = auction();
    if (!["CANCELLED", "DESERTED"].includes(state)) {
      expect(() => value.placeBid(bid("bad", "bidder", 1), RejectedBidAttemptId.create("rejected"))).toThrow();
      value.placeBid(bid(), RejectedBidAttemptId.create("unused"));
    }
    if (state === "CANCELLED") value.cancel(UserId.create("seller"));
    if (["CLOSED", "DESERTED", "DEFAULTED", "CONFIRMED"].includes(state)) {
      value.close(new Date("2026-01-02T00:00:00Z"), PaymentOrderId.create("order"));
    }
    if (state === "DEFAULTED") value.expirePayment(value.paymentOrder!.dueDate);
    if (state === "CONFIRMED") value.paymentOrder!.confirm();
    const before = serializeAuction(value);
    await new SqliteAuctionRepository(db).save(value);
    const restored = await reopen().findById(value.id);
    expect(restored).not.toBeNull();
    expect(serializeAuction(restored!)).toBe(before);
    if (state === "OPEN") {
      expect(() => restored!.placeBid(bid("own", "bidder", 110), RejectedBidAttemptId.create("new-rejection")))
        .toThrow("Highest bidder cannot outbid own leading bid");
    }
    if (state === "CLOSED") expect(() => restored!.close(new Date("2026-01-03T00:00:00Z"))).toThrow();
  });

  it("does not persist mutations until save and rejects stale writes without losing bids", async () => {
    const repository = new SqliteAuctionRepository(db);
    const original = auction();
    await repository.save(original);
    const first = (await repository.findById(original.id))!;
    const stale = (await repository.findById(original.id))!;
    first.placeBid(bid(), RejectedBidAttemptId.create("unused"));
    expect((await repository.findById(original.id))?.bidHistory).toHaveLength(0);
    await repository.save(first);
    stale.placeBid(bid("stale", "other", 100), RejectedBidAttemptId.create("unused-2"));
    await expect(repository.save(stale)).rejects.toMatchObject({ statusCode: 409, code: "CONCURRENT_MODIFICATION" });
    expect((await repository.findById(original.id))?.bidHistory[0]?.id.value).toBe("bid");
    expect((await repository.findAll())).toHaveLength(1);
  });

  it("fails explicitly on malformed stored aggregates instead of returning partial state", async () => {
    await new SqliteAuctionRepository(db).save(auction());
    db.prepare("UPDATE auctions SET document = ?").run('{"version":1,"status":"INVALID"}');
    await expect(new SqliteAuctionRepository(db).findAll()).rejects.toThrow("Cannot restore stored auction");
  });

  it("rejects duplicate user IDs without replacing the original account", async () => {
    const users = new SqliteUserRepository(db);
    const original = User.create(UserId.create("same-id"), "Original", Email.create("original@example.com"), "original-hash");
    await users.save(original);
    await expect(users.save(User.create(UserId.create("same-id"), "Other", Email.create("other@example.com"), "other-hash")))
      .rejects.toThrow("User ID is already registered");
    expect((await users.findById(original.id))?.hashedPassword).toBe("original-hash");
  });

  it("rejects future database versions", () => {
    db.exec("PRAGMA user_version = 999");
    expect(() => openDatabase(join(directory, "nested", "test.sqlite"))).toThrow("Unsupported database schema version");
  });
});
