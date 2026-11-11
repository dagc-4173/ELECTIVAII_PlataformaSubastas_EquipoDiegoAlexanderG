import type { Auction } from "../../domain/entities/Auction.js";
import type { PaymentEvent } from "../../domain/entities/PaymentEvent.js";

export type PaymentOutcome = "CONFIRMED" | "FAILED" | "EXPIRED" | "ALREADY_CONFIRMED" | "ORDER_NOT_FOUND";

export interface PaymentEventStore {
  process(
    event: PaymentEvent,
    apply: (auction: Auction | null) => { outcome: PaymentOutcome; changed: boolean },
  ): PaymentOutcome;
}

export class ProcessPaymentEventUseCase {
  constructor(private readonly store: PaymentEventStore) {}

  execute(event: PaymentEvent, now = new Date()): PaymentOutcome {
    return this.store.process(event, (auction) => {
      const order = auction?.paymentOrder;
      if (!auction || !order) return { outcome: "ORDER_NOT_FOUND", changed: false };
      if (order.status.value === "CONFIRMED") return { outcome: "ALREADY_CONFIRMED", changed: false };
      if (order.status.value === "EXPIRED") return { outcome: "EXPIRED", changed: false };
      if (now >= order.dueDate) {
        auction.expirePayment(now);
        return { outcome: "EXPIRED", changed: true };
      }
      if (event.result === "FAILED") return { outcome: "FAILED", changed: false };
      order.confirm();
      return { outcome: "CONFIRMED", changed: true };
    });
  }
}
