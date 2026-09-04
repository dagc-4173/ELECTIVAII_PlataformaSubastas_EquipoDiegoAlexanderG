import { describe, expect, it } from "vitest";

import { PaymentOrder } from "../../../src/domain/entities/PaymentOrder.js";
import { Money } from "../../../src/domain/value-objects/Money.js";
import { PaymentOrderId } from "../../../src/domain/value-objects/PaymentOrderId.js";
import { UserId } from "../../../src/domain/value-objects/UserId.js";

describe("PaymentOrder - RN-15", () => {
  it("should create a payment order for the winner and winning amount", () => {
    const createdAt = new Date("2026-09-03T12:00:00.000Z");

    const order = PaymentOrder.create(
      PaymentOrderId.create("payment-order-001"),
      UserId.create("user-001"),
      Money.create(250000),
      createdAt,
    );

    expect(order.id.value).toBe("payment-order-001");
    expect(order.winner.value).toBe("user-001");
    expect(order.amount.value).toBe(250000);
    expect(order.createdDate.toISOString()).toBe(createdAt.toISOString());
  });

  it("should set the payment deadline to 48 hours after creation", () => {
    const createdAt = new Date("2026-09-03T12:00:00.000Z");

    const order = PaymentOrder.create(
      PaymentOrderId.create("payment-order-001"),
      UserId.create("user-001"),
      Money.create(250000),
      createdAt,
    );

    expect(order.dueDate.toISOString()).toBe(
      "2026-09-05T12:00:00.000Z",
    );
  });

  it("should reject an invalid creation date", () => {
    expect(() =>
      PaymentOrder.create(
        PaymentOrderId.create("payment-order-001"),
        UserId.create("user-001"),
        Money.create(250000),
        new Date("invalid-date"),
      ),
    ).toThrow("Payment order creation date is invalid");
  });

  it("should protect internal dates from external mutation", () => {
    const order = PaymentOrder.create(
      PaymentOrderId.create("payment-order-001"),
      UserId.create("user-001"),
      Money.create(250000),
      new Date("2026-09-03T12:00:00.000Z"),
    );

    const createdDate = order.createdDate;
    const dueDate = order.dueDate;

    createdDate.setFullYear(2030);
    dueDate.setFullYear(2030);

    expect(order.createdDate.toISOString()).toBe(
      "2026-09-03T12:00:00.000Z",
    );

    expect(order.dueDate.toISOString()).toBe(
      "2026-09-05T12:00:00.000Z",
    );
  });

  it("should start in PENDING status", () => {
    const paymentOrder = PaymentOrder.create(
      PaymentOrderId.create("payment-order-001"),
      UserId.create("winner-001"),
      Money.create(105000),
      new Date("2026-09-04T18:00:00.000Z"),
    );

    expect(paymentOrder.status.value).toBe("PENDING");
  });

  it("RN-17 should confirm a pending payment order", () => {
    const paymentOrder = PaymentOrder.create(
      PaymentOrderId.create("payment-order-001"),
      UserId.create("winner-001"),
      Money.create(105000),
      new Date("2026-09-04T18:00:00.000Z"),
    );

    paymentOrder.confirm();

    expect(paymentOrder.status.value).toBe("CONFIRMED");
  });

  it("RN-17 should reject confirming a payment order more than once", () => {
    const paymentOrder = PaymentOrder.create(
      PaymentOrderId.create("payment-order-001"),
      UserId.create("winner-001"),
      Money.create(105000),
      new Date("2026-09-04T18:00:00.000Z"),
    );

    paymentOrder.confirm();

    expect(() => paymentOrder.confirm()).toThrow(
      "Only pending payment orders can be confirmed",
    );

    expect(paymentOrder.status.value).toBe("CONFIRMED");
  });

  it("RN-20 should expire a pending payment order at its due date", () => {
    const paymentOrder = PaymentOrder.create(
      PaymentOrderId.create("payment-order-001"),
      UserId.create("winner-001"),
      Money.create(105000),
      new Date("2026-09-04T18:00:00.000Z"),
    );

    paymentOrder.expire(new Date("2026-09-06T18:00:00.000Z"));

    expect(paymentOrder.status.value).toBe("EXPIRED");
  });

  it("RN-20 should reject expiration before the payment deadline", () => {
    const paymentOrder = PaymentOrder.create(
      PaymentOrderId.create("payment-order-001"),
      UserId.create("winner-001"),
      Money.create(105000),
      new Date("2026-09-04T18:00:00.000Z"),
    );

    expect(() =>
      paymentOrder.expire(new Date("2026-09-06T17:59:59.000Z")),
    ).toThrow("Payment order cannot expire before its due date");

    expect(paymentOrder.status.value).toBe("PENDING");
  });

  it("RN-20 should reject expiration of a confirmed payment order", () => {
    const paymentOrder = PaymentOrder.create(
      PaymentOrderId.create("payment-order-001"),
      UserId.create("winner-001"),
      Money.create(105000),
      new Date("2026-09-04T18:00:00.000Z"),
    );

    paymentOrder.confirm();

    expect(() =>
      paymentOrder.expire(new Date("2026-09-06T18:00:00.000Z")),
    ).toThrow("Only pending payment orders can expire");

    expect(paymentOrder.status.value).toBe("CONFIRMED");
  });

});