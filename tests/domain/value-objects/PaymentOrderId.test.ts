import { describe, expect, it } from "vitest";

import { PaymentOrderId } from "../../../src/domain/value-objects/PaymentOrderId.js";

describe("PaymentOrderId", () => {
  it("should create a valid payment order id", () => {
    const id = PaymentOrderId.create("payment-order-001");

    expect(id.value).toBe("payment-order-001");
  });

  it("should trim surrounding spaces", () => {
    const id = PaymentOrderId.create("  payment-order-001  ");

    expect(id.value).toBe("payment-order-001");
  });

  it("should reject an empty payment order id", () => {
    expect(() => PaymentOrderId.create("   ")).toThrow(
      "Payment order id cannot be empty",
    );
  });

  it("should compare payment order ids by value", () => {
    const firstId = PaymentOrderId.create("payment-order-001");
    const secondId = PaymentOrderId.create("payment-order-001");

    expect(firstId.equals(secondId)).toBe(true);
  });
});