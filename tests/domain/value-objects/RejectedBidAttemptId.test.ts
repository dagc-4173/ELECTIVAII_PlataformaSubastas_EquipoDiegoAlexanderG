import { describe, expect, it } from "vitest";

import { RejectedBidAttemptId } from "../../../src/domain/value-objects/RejectedBidAttemptId.js";

describe("RejectedBidAttemptId", () => {
  it("should create a valid rejected bid attempt id", () => {
    const id = RejectedBidAttemptId.create("rejected-bid-001");

    expect(id.value).toBe("rejected-bid-001");
  });

  it("should trim surrounding spaces", () => {
    const id = RejectedBidAttemptId.create("  rejected-bid-001  ");

    expect(id.value).toBe("rejected-bid-001");
  });

  it("should reject an empty rejected bid attempt id", () => {
    expect(() => RejectedBidAttemptId.create("   ")).toThrow(
      "Rejected bid attempt id cannot be empty",
    );
  });

  it("should compare rejected bid attempt ids by value", () => {
    const firstId = RejectedBidAttemptId.create("rejected-bid-001");
    const secondId = RejectedBidAttemptId.create("rejected-bid-001");

    expect(firstId.equals(secondId)).toBe(true);
  });
});