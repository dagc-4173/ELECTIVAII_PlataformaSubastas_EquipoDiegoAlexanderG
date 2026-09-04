import type { AuctionRepository } from "../../domain/ports/AuctionRepository.js";
import { Auction } from "../../domain/entities/Auction.js";
import { AuctionId } from "../../domain/value-objects/AuctionId.js";

export class GetAuctionUseCase {
  constructor(private readonly auctionRepository: AuctionRepository) {}

  async execute(auctionId: string): Promise<Auction | null> {
    return this.auctionRepository.findById(
      AuctionId.create(auctionId),
    );
  }
}