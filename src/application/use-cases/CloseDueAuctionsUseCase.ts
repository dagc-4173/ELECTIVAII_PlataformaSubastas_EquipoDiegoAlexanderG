import type { Auction } from "../../domain/entities/Auction.js";
import { PaymentOrderId } from "../../domain/value-objects/PaymentOrderId.js";
import { announceAuctionClosed } from "../events/announceAuctionEvent.js";
import type { AuctionEventPublisher } from "../ports/AuctionEventPublisher.js";
import type { IdGenerator } from "../ports/IdGenerator.js";

export interface DueAuctionStore {
  closeDue(now: Date, close: (auction: Auction) => void): readonly Auction[];
}

export class CloseDueAuctionsUseCase {
  constructor(
    private readonly store: DueAuctionStore,
    private readonly ids: IdGenerator,
    private readonly events: AuctionEventPublisher,
  ) {}

  execute(now = new Date()): number {
    const closed = this.store.closeDue(now, (auction) => {
      const orderId = auction.bidHistory.length > 0 ? PaymentOrderId.create(this.ids.generate()) : undefined;
      auction.close(now, orderId);
    });
    for (const auction of closed) announceAuctionClosed(this.events, auction);
    return closed.length;
  }
}
