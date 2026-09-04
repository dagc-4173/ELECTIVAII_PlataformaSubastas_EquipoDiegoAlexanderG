import { describe, expect, it } from "vitest";

import { AuctionStatus } from "../../../src/domain/value-objects/AuctionStatus.js";

describe("AuctionStatus", () => {
  it("should create an open status", () => {
    const status = AuctionStatus.open();

    expect(status.value).toBe("OPEN");
  });

  it("should create a cancelled status", () => {
    const status = AuctionStatus.cancelled();

    expect(status.value).toBe("CANCELLED");
  });

  it("should compare statuses by value", () => {
    const firstStatus = AuctionStatus.closed();
    const secondStatus = AuctionStatus.closed();

    expect(firstStatus.equals(secondStatus)).toBe(true);
  });

  it("should distinguish different statuses", () => {
    const openStatus = AuctionStatus.open();
    const closedStatus = AuctionStatus.closed();

    expect(openStatus.equals(closedStatus)).toBe(false);
  });
});