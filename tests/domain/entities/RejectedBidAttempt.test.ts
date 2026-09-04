import { describe, expect, it } from "vitest";

import { RejectedBidAttempt } from "../../../src/domain/entities/RejectedBidAttempt.js";
import { Money } from "../../../src/domain/value-objects/Money.js";
import { RejectedBidAttemptId } from "../../../src/domain/value-objects/RejectedBidAttemptId.js";
import { UserId } from "../../../src/domain/value-objects/UserId.js";

describe("RejectedBidAttempt - RN-12", () => {
  it("should create a rejected bid attempt with valid data", () => {
    const attemptedAt = new Date("2026-09-01T12:00:00.000Z");

    const attempt = RejectedBidAttempt.create(
      RejectedBidAttemptId.create("rejected-bid-001"),
      UserId.create("user-001"),
      Money.create(100000),
      "Bid amount is too low",
      attemptedAt,
    );

    expect(attempt.id.value).toBe("rejected-bid-001");
    expect(attempt.bidder.value).toBe("user-001");
    expect(attempt.amount.value).toBe(100000);
    expect(attempt.reason).toBe("Bid amount is too low");
    expect(attempt.date.toISOString()).toBe(attemptedAt.toISOString());
  });

  it("should trim the rejection reason", () => {
    const attempt = RejectedBidAttempt.create(
      RejectedBidAttemptId.create("rejected-bid-001"),
      UserId.create("user-001"),
      Money.create(100000),
      "  Bid amount is too low  ",
      new Date("2026-09-01T12:00:00.000Z"),
    );

    expect(attempt.reason).toBe("Bid amount is too low");
  });

  it("should reject an empty rejection reason", () => {
    expect(() =>
      RejectedBidAttempt.create(
        RejectedBidAttemptId.create("rejected-bid-001"),
        UserId.create("user-001"),
        Money.create(100000),
        "   ",
        new Date("2026-09-01T12:00:00.000Z"),
      ),
    ).toThrow("Rejected bid attempt reason cannot be empty");
  });

  it("should reject an invalid attempt date", () => {
    expect(() =>
      RejectedBidAttempt.create(
        RejectedBidAttemptId.create("rejected-bid-001"),
        UserId.create("user-001"),
        Money.create(100000),
        "Bid amount is too low",
        new Date("invalid-date"),
      ),
    ).toThrow("Rejected bid attempt date is invalid");
  });

  it("should protect the internal attempt date from external mutation", () => {
    const attempt = RejectedBidAttempt.create(
      RejectedBidAttemptId.create("rejected-bid-001"),
      UserId.create("user-001"),
      Money.create(100000),
      "Bid amount is too low",
      new Date("2026-09-01T12:00:00.000Z"),
    );

    const returnedDate = attempt.date;
    returnedDate.setFullYear(2030);

    expect(attempt.date.toISOString()).toBe(
      "2026-09-01T12:00:00.000Z",
    );
  });
});