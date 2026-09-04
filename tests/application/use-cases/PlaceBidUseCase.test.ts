import { describe, expect, it } from "vitest";

import { PlaceBidUseCase } from "../../../src/application/use-cases/PlaceBidUseCase.js";
import { InMemoryAuctionRepository } from "../../../src/infrastructure/persistence/memory/InMemoryAuctionRepository.js";
import { Auction } from "../../../src/domain/entities/Auction.js";
import { AuctionId } from "../../../src/domain/value-objects/AuctionId.js";
import { AuctionPublicationData } from "../../../src/domain/value-objects/AuctionPublicationData.js";
import { CategoryId } from "../../../src/domain/value-objects/CategoryId.js";
import { ItemId } from "../../../src/domain/value-objects/ItemId.js";
import { Money } from "../../../src/domain/value-objects/Money.js";
import { UserId } from "../../../src/domain/value-objects/UserId.js";

function createAuction(): Auction {
  return Auction.publish(
    AuctionId.create("auction-001"),
    UserId.create("seller-001"),
    ItemId.create("item-001"),
    CategoryId.create("category-001"),
    AuctionPublicationData.create(
      Money.create(100000),
      Money.create(5000),
      new Date("2026-09-04T12:00:00.000Z"),
      new Date("2026-09-05T12:00:00.000Z"),
    ),
  );
}

describe("PlaceBidUseCase", () => {
  it("should place and persist a valid bid", async () => {
    const repository = new InMemoryAuctionRepository();
    const auction = createAuction();

    await repository.save(auction);

    const useCase = new PlaceBidUseCase(repository);

    const result = await useCase.execute({
      auctionId: "auction-001",
      bidId: "bid-001",
      bidderId: "bidder-001",
      amount: 100000,
      placedAt: new Date("2026-09-04T13:00:00.000Z"),
      rejectedBidAttemptId: "rejected-attempt-001",
    });

    const highestBid = result.bidHistory.at(-1);

    expect(highestBid?.amount.value).toBe(100000);
    expect(highestBid?.bidder.value).toBe("bidder-001");
  });

  it("should reject a bid below the base price", async () => {
    const repository = new InMemoryAuctionRepository();
    const auction = createAuction();

    await repository.save(auction);

    const useCase = new PlaceBidUseCase(repository);

    await expect(
      useCase.execute({
        auctionId: "auction-001",
        bidId: "bid-001",
        bidderId: "bidder-001",
        amount: 90000,
        placedAt: new Date("2026-09-04T13:00:00.000Z"),
        rejectedBidAttemptId: "rejected-attempt-001",
      }),
    ).rejects.toThrow(
      "First bid must be greater than or equal to base price",
    );
  });

  it("should preserve the rejected bid attempt after rejection", async () => {
    const repository = new InMemoryAuctionRepository();
    const auction = createAuction();

    await repository.save(auction);

    const useCase = new PlaceBidUseCase(repository);

    await expect(
      useCase.execute({
        auctionId: "auction-001",
        bidId: "bid-001",
        bidderId: "bidder-001",
        amount: 90000,
        placedAt: new Date("2026-09-04T13:00:00.000Z"),
        rejectedBidAttemptId: "rejected-attempt-001",
      }),
    ).rejects.toThrow();

    const storedAuction = await repository.findById(
      AuctionId.create("auction-001"),
    );

    expect(storedAuction?.rejectedBidHistory).toHaveLength(1);
  });

  it("should reject when auction does not exist", async () => {
    const repository = new InMemoryAuctionRepository();
    const useCase = new PlaceBidUseCase(repository);

    await expect(
      useCase.execute({
        auctionId: "auction-404",
        bidId: "bid-001",
        bidderId: "bidder-001",
        amount: 100000,
        placedAt: new Date("2026-09-04T13:00:00.000Z"),
        rejectedBidAttemptId: "rejected-attempt-001",
      }),
    ).rejects.toThrow("Auction not found");
  });
});