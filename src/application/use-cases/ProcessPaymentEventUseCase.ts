import type { Auction } from "../../domain/entities/Auction.js";
import type { PaymentEvent } from "../../domain/entities/PaymentEvent.js";
import { announceAuctionEvent } from "../events/announceAuctionEvent.js";
import type { AuctionEvent, AuctionEventPublisher } from "../ports/AuctionEventPublisher.js";

export type PaymentOutcome = "CONFIRMED" | "FAILED" | "EXPIRED" | "ALREADY_CONFIRMED" | "ORDER_NOT_FOUND";

export interface PaymentEventStore {
  process(
    event: PaymentEvent,
    apply: (auction: Auction | null) => { outcome: PaymentOutcome; changed: boolean },
  ): PaymentOutcome;
}

export class ProcessPaymentEventUseCase {
  constructor(private readonly store: PaymentEventStore, private readonly events: AuctionEventPublisher) {}

  execute(event: PaymentEvent, now = new Date()): PaymentOutcome {
    let notification: AuctionEvent | undefined;
    const outcome = this.store.process(event, (auction) => {
      const order = auction?.paymentOrder;
      if (!auction || !order) return { outcome: "ORDER_NOT_FOUND", changed: false };
      if (order.status.value === "CONFIRMED") return { outcome: "ALREADY_CONFIRMED", changed: false };
      if (order.status.value === "EXPIRED") return { outcome: "EXPIRED", changed: false };
      if (now >= order.dueDate) {
        auction.expirePayment(now);
        notification = { type: "PAYMENT_UPDATED", auctionId: auction.id.value };
        return { outcome: "EXPIRED", changed: true };
      }
      if (event.result === "FAILED") return { outcome: "FAILED", changed: false };
      order.confirm();
      notification = { type: "PAYMENT_UPDATED", auctionId: auction.id.value, recipientId: order.winner.value };
      return { outcome: "CONFIRMED", changed: true };
    });
    if (notification) announceAuctionEvent(this.events, notification);
    return outcome;
  }
}
