import type { Auction } from "../../domain/entities/Auction.js";
import type { AuctionEvent, AuctionEventPublisher } from "../ports/AuctionEventPublisher.js";

export function announceAuctionEvent(publisher: AuctionEventPublisher, event: AuctionEvent): void {
  try {
    publisher.publish(event);
  } catch (error: unknown) {
    // The committed operation stays successful even when transient delivery fails.
    console.error("Auction event delivery failed:", error);
  }
}

export function announceAuctionClosed(publisher: AuctionEventPublisher, auction: Auction): void {
  const status = auction.status.value;
  if (status !== "CLOSED" && status !== "DESERTED") return;
  announceAuctionEvent(publisher, {
    type: "AUCTION_CLOSED", auctionId: auction.id.value, status,
    sellerId: auction.seller.value, winnerId: auction.winner?.value ?? null,
    amount: auction.paymentOrder?.amount.value ?? null,
  });
}
