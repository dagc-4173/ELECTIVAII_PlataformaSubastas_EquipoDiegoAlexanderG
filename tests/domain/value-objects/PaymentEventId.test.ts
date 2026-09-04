import { describe, expect, it } from "vitest";

import { PaymentEventId } from "../../../src/domain/value-objects/PaymentEventId.js";

describe("PaymentEventId", () => {
  it("should create a valid payment event id", () => {
    const id = PaymentEventId.create("payment-event-001");

    expect(id.value).toBe("payment-event-001");
  });

  it("should trim surrounding spaces", () => {
    const id = PaymentEventId.create("  payment-event-001  ");

    expect(id.value).toBe("payment-event-001");
  });

  it("should reject an empty payment event id", () => {
    expect(() => PaymentEventId.create("   ")).toThrow(
      "Payment event id cannot be empty",
    );
  });

  it("should compare payment event ids by value", () => {
    const firstId = PaymentEventId.create("payment-event-001");
    const secondId = PaymentEventId.create("payment-event-001");

    expect(firstId.equals(secondId)).toBe(true);
  });
});