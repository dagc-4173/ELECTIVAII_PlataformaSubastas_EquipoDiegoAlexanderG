import { Auction } from "../../../domain/entities/Auction.js";

export interface AuctionResponse {
  id: string;
  sellerId: string;
  itemId: string;
  categoryId: string;
  basePrice: number;
  minimumIncrement: number;
  publishedAt: string;
  closesAt: string;
  status: string;
  bids: {
    id: string;
    bidderId: string;
    amount: number;
    placedAt: string;
  }[];
  rejectedBidAttempts: {
    id: string;
    bidderId: string;
    amount: number;
    reason: string;
    attemptedAt: string;
  }[];
}

export class AuctionResponseMapper {
  static toResponse(auction: Auction): AuctionResponse {
    return {
      id: auction.id.value,
      sellerId: auction.seller.value,
      itemId: auction.item.value,
      categoryId: auction.category.value,
      basePrice: auction.publication.basePrice.value,
      minimumIncrement: auction.publication.minimumIncrement.value,
      publishedAt: auction.publication.publishedAt.toISOString(),
      closesAt: auction.publication.closesAt.toISOString(),
      status: auction.status.value,

      bids: auction.bidHistory.map((bid) => ({
        id: bid.id.value,
        bidderId: bid.bidder.value,
        amount: bid.amount.value,
        placedAt: bid.date.toISOString(),
      })),

      rejectedBidAttempts: auction.rejectedBidHistory.map((attempt) => ({
        id: attempt.id.value,
        bidderId: attempt.bidder.value,
        amount: attempt.amount.value,
        reason: attempt.reason,
        attemptedAt: attempt.date.toISOString(),
      })),
    };
  }
}