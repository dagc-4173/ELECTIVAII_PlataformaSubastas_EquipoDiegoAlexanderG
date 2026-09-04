import type { AuctionRepository } from "../../domain/ports/AuctionRepository.js";
import { Auction } from "../../domain/entities/Auction.js";
import { Bid } from "../../domain/entities/Bid.js";
import { AuctionId } from "../../domain/value-objects/AuctionId.js";
import { BidId } from "../../domain/value-objects/BidId.js";
import { Money } from "../../domain/value-objects/Money.js";
import { RejectedBidAttemptId } from "../../domain/value-objects/RejectedBidAttemptId.js";
import { UserId } from "../../domain/value-objects/UserId.js";

export interface PlaceBidInput {
  auctionId: string;
  bidId: string;
  bidderId: string;
  amount: number;
  placedAt: Date;
  rejectedBidAttemptId: string;
}

export class PlaceBidUseCase {
  constructor(private readonly auctionRepository: AuctionRepository) {}

  async execute(input: PlaceBidInput): Promise<Auction> {
    const auction = await this.auctionRepository.findById(
      AuctionId.create(input.auctionId),
    );

    if (auction === null) {
      throw new Error("Auction not found");
    }

    const bid = Bid.create(
      BidId.create(input.bidId),
      UserId.create(input.bidderId),
      Money.create(input.amount),
      input.placedAt,
    );

    try {
      auction.placeBid(
        bid,
        RejectedBidAttemptId.create(input.rejectedBidAttemptId),
      );
    } catch (error: unknown) {
      await this.auctionRepository.save(auction);
      throw error;
    }

    await this.auctionRepository.save(auction);

    return auction;
  }
}