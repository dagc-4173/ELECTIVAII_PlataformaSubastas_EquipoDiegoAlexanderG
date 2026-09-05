import { describe, expect, it } from "vitest";

import { PublishAuctionUseCase } from "../../../src/application/use-cases/PublishAuctionUseCase.js";
import type { AuctionRepository } from "../../../src/domain/ports/AuctionRepository.js";
import { Auction } from "../../../src/domain/entities/Auction.js";
import { AuctionId } from "../../../src/domain/value-objects/AuctionId.js";

class FakeAuctionRepository implements AuctionRepository {
  private readonly auctions: Auction[] = [];

  async save(auction: Auction): Promise<void> {
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

describe("PublishAuctionUseCase", () => {
  it("should publish and persist a valid auction", async () => {
    const repository = new FakeAuctionRepository();
    const useCase = new PublishAuctionUseCase(repository);

    const auction = await useCase.execute({
      auctionId: "auction-001",
      sellerId: "seller-001",
      itemId: "item-001",
      categoryId: "category-001",
      basePrice: 100000,
      minimumIncrement: 5000,
      publishedAt: new Date("2026-09-04T12:00:00.000Z"),
      closesAt: new Date("2026-09-05T12:00:00.000Z"),
    });

    const storedAuction = await repository.findById(
      AuctionId.create("auction-001"),
    );

    expect(storedAuction).toBe(auction);
  });

  it("should reject publishing an auction with an existing auction ID", async () => {
    const repository = new FakeAuctionRepository();
    const useCase = new PublishAuctionUseCase(repository);

    const input = {
      auctionId: "auction-001",
      sellerId: "seller-001",
      itemId: "item-001",
      categoryId: "category-001",
      basePrice: 100000,
      minimumIncrement: 5000,
      publishedAt: new Date("2026-09-04T12:00:00.000Z"),
      closesAt: new Date("2026-09-05T12:00:00.000Z"),
    };

    await useCase.execute(input);

    await expect(
      useCase.execute({
        ...input,
        sellerId: "seller-002",
      }),
    ).rejects.toThrow("Auction ID is already registered");

    const auctions = await repository.findAll();

    expect(auctions).toHaveLength(1);
  });
});