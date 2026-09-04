import { describe, expect, it } from "vitest";

import { PaymentEvent } from "../../../src/domain/entities/PaymentEvent.js";
import { PaymentEventId } from "../../../src/domain/value-objects/PaymentEventId.js";
import { PaymentOrderId } from "../../../src/domain/value-objects/PaymentOrderId.js";

describe("PaymentEvent", () => {
  it("should create a payment event with valid data", () => {
    const occurredAt = new Date("2026-09-03T18:00:00.000Z");

    const event = PaymentEvent.create(
      PaymentEventId.create("payment-event-001"),
      PaymentOrderId.create("payment-order-001"),
      "SUCCESS",
      occurredAt,
    );

    expect(event.id.value).toBe("payment-event-001");
    expect(event.paymentOrderId.value).toBe("payment-order-001");
    expect(event.result).toBe("SUCCESS");
    expect(event.date.toISOString()).toBe(occurredAt.toISOString());
  });

  it("should allow a failed payment result", () => {
    const event = PaymentEvent.create(
      PaymentEventId.create("payment-event-001"),
      PaymentOrderId.create("payment-order-001"),
      "FAILED",
      new Date("2026-09-03T18:00:00.000Z"),
    );

    expect(event.result).toBe("FAILED");
  });

  it("should reject an invalid payment event date", () => {
    expect(() =>
      PaymentEvent.create(
        PaymentEventId.create("payment-event-001"),
        PaymentOrderId.create("payment-order-001"),
        "SUCCESS",
        new Date("invalid-date"),
      ),
    ).toThrow("Payment event date is invalid");
  });

  it("should protect the internal event date from external mutation", () => {
    const event = PaymentEvent.create(
      PaymentEventId.create("payment-event-001"),
      PaymentOrderId.create("payment-order-001"),
      "SUCCESS",
      new Date("2026-09-03T18:00:00.000Z"),
    );

    const returnedDate = event.date;
    returnedDate.setFullYear(2030);

    expect(event.date.toISOString()).toBe(
      "2026-09-03T18:00:00.000Z",
    );
  });
});