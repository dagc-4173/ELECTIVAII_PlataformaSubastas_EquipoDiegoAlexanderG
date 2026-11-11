import type { Auction } from "../../domain/entities/Auction.js";
import { announceAuctionEvent } from "../events/announceAuctionEvent.js";
import type { AuctionEventPublisher } from "../ports/AuctionEventPublisher.js";

export interface PendingPaymentStore {
  expireDue(now: Date, expire: (auction: Auction) => void): number;
}

export class ExpirePendingPaymentsUseCase {
  constructor(private readonly store: PendingPaymentStore, private readonly events: AuctionEventPublisher) {}

  execute(now = new Date()): number {
    const auctionIds: string[] = [];
    const expired = this.store.expireDue(now, (auction) => {
      auction.expirePayment(now);
      auctionIds.push(auction.id.value);
    });
    for (const auctionId of auctionIds) announceAuctionEvent(this.events, { type: "PAYMENT_UPDATED", auctionId });
    return expired;
  }
}
