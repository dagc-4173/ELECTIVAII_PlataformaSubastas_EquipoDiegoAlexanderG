import { describe, expect, it } from "vitest";

import { AuctionId } from "../../../src/domain/value-objects/AuctionId.js";

describe("AuctionId", () => {
  it("should create a valid auction id", () => {
    const auctionId = AuctionId.create("auction-001");

    expect(auctionId.value).toBe("auction-001");
  });

  it("should trim surrounding spaces", () => {
    const auctionId = AuctionId.create("  auction-001  ");

    expect(auctionId.value).toBe("auction-001");
  });

  it("should reject an empty auction id", () => {
    expect(() => AuctionId.create("   ")).toThrow(
      "Auction id cannot be empty",
    );
  });

  it("should compare auction ids by value", () => {
    const firstId = AuctionId.create("auction-001");
    const secondId = AuctionId.create("auction-001");

    expect(firstId.equals(secondId)).toBe(true);
  });
});