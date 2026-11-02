export type AuctionEvent =
  | { type: "BID_ACCEPTED"; auctionId: string; bidId: string; bidderId: string; amount: number; placedAt: string }
  | { type: "BID_OUTBID"; auctionId: string; recipientId: string; currentBidderId: string; amount: number }
  | { type: "AUCTION_CLOSED"; auctionId: string; status: "CLOSED" | "DESERTED"; sellerId: string; winnerId: string | null; amount: number | null };

export interface AuctionEventPublisher {
  publish(event: AuctionEvent): void;
}

export const discardAuctionEvents: AuctionEventPublisher = { publish: () => {} };
