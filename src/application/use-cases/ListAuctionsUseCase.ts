import type { AuctionRepository } from "../../domain/ports/AuctionRepository.js";
import { Auction } from "../../domain/entities/Auction.js";

export class ListAuctionsUseCase {
  constructor(private readonly auctionRepository: AuctionRepository) {}

  async execute(): Promise<readonly Auction[]> {
    return this.auctionRepository.findAll();
  }
}