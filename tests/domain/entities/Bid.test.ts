import { describe, expect, it } from "vitest";

import { Bid } from "../../../src/domain/entities/Bid.js";
import { BidId } from "../../../src/domain/value-objects/BidId.js";
import { Money } from "../../../src/domain/value-objects/Money.js";
import { UserId } from "../../../src/domain/value-objects/UserId.js";

describe("Bid", () => {
  it("should create a bid with valid data", () => {
    const placedAt = new Date("2026-09-01T12:00:00.000Z");

    const bid = Bid.create(
      BidId.create("bid-001"),
      UserId.create("user-001"),
      Money.create(100000),
      placedAt,
    );

    expect(bid.id.value).toBe("bid-001");
    expect(bid.bidder.value).toBe("user-001");
    expect(bid.amount.value).toBe(100000);
    expect(bid.date.toISOString()).toBe(placedAt.toISOString());
  });

  it("should reject an invalid placement date", () => {
    expect(() =>
      Bid.create(
        BidId.create("bid-001"),
        UserId.create("user-001"),
        Money.create(100000),
        new Date("invalid-date"),
      ),
    ).toThrow("Bid placement date is invalid");
  });

  it("should protect the internal placement date from external mutation", () => {
    const originalDate = new Date("2026-09-01T12:00:00.000Z");

    const bid = Bid.create(
      BidId.create("bid-001"),
      UserId.create("user-001"),
      Money.create(100000),
      originalDate,
    );

    const returnedDate = bid.date;
    returnedDate.setFullYear(2030);

    expect(bid.date.toISOString()).toBe(
      "2026-09-01T12:00:00.000Z",
    );
  });
});