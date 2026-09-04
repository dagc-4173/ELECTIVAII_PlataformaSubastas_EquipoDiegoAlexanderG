import { PaymentEventId } from "../value-objects/PaymentEventId.js";
import { PaymentOrderId } from "../value-objects/PaymentOrderId.js";

export type PaymentEventResult = "SUCCESS" | "FAILED";

export class PaymentEvent {
  private constructor(
    private readonly eventId: PaymentEventId,
    private readonly orderId: PaymentOrderId,
    private readonly paymentResult: PaymentEventResult,
    private readonly occurredAt: Date,
  ) {}

  static create(
    id: PaymentEventId,
    orderId: PaymentOrderId,
    result: PaymentEventResult,
    occurredAt: Date,
  ): PaymentEvent {
    if (Number.isNaN(occurredAt.getTime())) {
      throw new Error("Payment event date is invalid");
    }

    return new PaymentEvent(
      id,
      orderId,
      result,
      new Date(occurredAt),
    );
  }

  get id(): PaymentEventId {
    return this.eventId;
  }

  get paymentOrderId(): PaymentOrderId {
    return this.orderId;
  }

  get result(): PaymentEventResult {
    return this.paymentResult;
  }

  get date(): Date {
    return new Date(this.occurredAt);
  }
}