import { describe, expect, it } from "vitest";

import { CancelAuctionUseCase } from "../../../src/application/use-cases/CancelAuctionUseCase.js";
import { InMemoryAuctionRepository } from "../../../src/infrastructure/persistence/memory/InMemoryAuctionRepository.js";
import { Auction } from "../../../src/domain/entities/Auction.js";
import { Bid } from "../../../src/domain/entities/Bid.js";
import { AuctionId } from "../../../src/domain/value-objects/AuctionId.js";
import { AuctionPublicationData } from "../../../src/domain/value-objects/AuctionPublicationData.js";
import { BidId } from "../../../src/domain/value-objects/BidId.js";
import { CategoryId } from "../../../src/domain/value-objects/CategoryId.js";
import { ItemId } from "../../../src/domain/value-objects/ItemId.js";
import { Money } from "../../../src/domain/value-objects/Money.js";
import { RejectedBidAttemptId } from "../../../src/domain/value-objects/RejectedBidAttemptId.js";
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

describe("CancelAuctionUseCase", () => {
  it("should cancel an auction without bids", async () => {
    const repository = new InMemoryAuctionRepository();
    const auction = createAuction();

    await repository.save(auction);

    const useCase = new CancelAuctionUseCase(repository);

    const result = await useCase.execute("auction-001");

    expect(result.status.value).toBe("CANCELLED");
  });

  it("should reject cancellation when auction has bids", async () => {
    const repository = new InMemoryAuctionRepository();
    const auction = createAuction();

    auction.placeBid(
      Bid.create(
        BidId.create("bid-001"),
        UserId.create("bidder-001"),
        Money.create(100000),
        new Date("2026-09-04T13:00:00.000Z"),
      ),
      RejectedBidAttemptId.create("rejected-attempt-001"),
    );

    await repository.save(auction);

    const useCase = new CancelAuctionUseCase(repository);

    await expect(
      useCase.execute("auction-001"),
    ).rejects.toThrow("Auction with bids cannot be cancelled");
  });

  it("should reject cancellation when auction does not exist", async () => {
    const repository = new InMemoryAuctionRepository();
    const useCase = new CancelAuctionUseCase(repository);

    await expect(
      useCase.execute("auction-404"),
    ).rejects.toThrow("Auction not found");
  });
});
