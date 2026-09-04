import { describe, expect, it } from "vitest";

import { PaymentOrderStatus } from "../../../src/domain/value-objects/PaymentOrderStatus.js";

describe("PaymentOrderStatus", () => {
  it("should create a pending payment order status", () => {
    const status = PaymentOrderStatus.pending();

    expect(status.value).toBe("PENDING");
  });

  it("should create a confirmed payment order status", () => {
    const status = PaymentOrderStatus.confirmed();

    expect(status.value).toBe("CONFIRMED");
  });

  it("should create an expired payment order status", () => {
    const status = PaymentOrderStatus.expired();

    expect(status.value).toBe("EXPIRED");
  });

  it("should compare payment order statuses by value", () => {
    expect(
      PaymentOrderStatus.pending().equals(PaymentOrderStatus.pending()),
    ).toBe(true);

    expect(
      PaymentOrderStatus.pending().equals(PaymentOrderStatus.confirmed()),
    ).toBe(false);
  });
});