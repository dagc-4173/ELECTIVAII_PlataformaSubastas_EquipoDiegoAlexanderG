import type { AuctionRepository } from "../../../domain/ports/AuctionRepository.js";
import { Auction } from "../../../domain/entities/Auction.js";
import { AuctionId } from "../../../domain/value-objects/AuctionId.js";

export class InMemoryAuctionRepository implements AuctionRepository {
  private readonly auctions: Auction[] = [];

  async save(auction: Auction): Promise<void> {
    const existingIndex = this.auctions.findIndex(
      (currentAuction) => currentAuction.id.equals(auction.id),
    );

    if (existingIndex >= 0) {
      this.auctions[existingIndex] = auction;
      return;
    }

    this.auctions.push(auction);
  }

  async findById(id: AuctionId): Promise<Auction | null> {
    return (
      this.auctions.find((auction) => auction.id.equals(id)) ??
      null
    );
  }

  async findAll(): Promise<readonly Auction[]> {
    return this.auctions;
  }
}