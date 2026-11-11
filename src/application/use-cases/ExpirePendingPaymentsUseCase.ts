import type { Auction } from "../../domain/entities/Auction.js";

export interface PendingPaymentStore {
  expireDue(now: Date, expire: (auction: Auction) => void): number;
}

export class ExpirePendingPaymentsUseCase {
  constructor(private readonly store: PendingPaymentStore) {}

  execute(now = new Date()): number {
    return this.store.expireDue(now, (auction) => auction.expirePayment(now));
  }
}
