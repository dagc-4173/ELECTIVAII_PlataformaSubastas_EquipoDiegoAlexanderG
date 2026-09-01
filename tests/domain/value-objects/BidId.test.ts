import { describe, expect, it } from "vitest";

import { BidId } from "../../../src/domain/value-objects/BidId.js";

describe("BidId", () => {
  it("should create a valid bid id", () => {
    const bidId = BidId.create("bid-001");

    expect(bidId.value).toBe("bid-001");
  });

  it("should trim surrounding spaces", () => {
    const bidId = BidId.create("  bid-001  ");

    expect(bidId.value).toBe("bid-001");
  });

  it("should reject an empty bid id", () => {
    expect(() => BidId.create("   ")).toThrow(
      "Bid id cannot be empty",
    );
  });

  it("should compare bid ids by value", () => {
    const firstId = BidId.create("bid-001");
    const secondId = BidId.create("bid-001");

    expect(firstId.equals(secondId)).toBe(true);
  });
});