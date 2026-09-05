import { describe, expect, it } from "vitest";

import { CloseAuctionUseCase } from "../../../src/application/use-cases/CloseAuctionUseCase.js";
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

describe("CloseAuctionUseCase", () => {
  it("should close an auction with bids and create a payment order", async () => {
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

    const useCase = new CloseAuctionUseCase(repository);

    const result = await useCase.execute({
      auctionId: "auction-001",
      closedAt: new Date("2026-09-05T12:00:00.000Z"),
      paymentOrderId: "payment-order-001",
    });

    expect(result.status.value).toBe("CLOSED");
    expect(result.winner?.value).toBe("bidder-001");
    expect(result.paymentOrder).toBeDefined();
  });

  it("should mark an auction without bids as deserted", async () => {
    const repository = new InMemoryAuctionRepository();
    const auction = createAuction();

    await repository.save(auction);

    const useCase = new CloseAuctionUseCase(repository);

    const result = await useCase.execute({
      auctionId: "auction-001",
      closedAt: new Date("2026-09-05T12:00:00.000Z"),
    });

    expect(result.status.value).toBe("DESERTED");
    expect(result.winner).toBeUndefined();
    expect(result.paymentOrder).toBeUndefined();
  });

  it("should reject closing an auction that does not exist", async () => {
    const repository = new InMemoryAuctionRepository();
    const useCase = new CloseAuctionUseCase(repository);

    await expect(
      useCase.execute({
        auctionId: "auction-404",
        closedAt: new Date("2026-09-05T12:00:00.000Z"),
      }),
    ).rejects.toThrow("Auction not found");
  });

  it("should reject closing the same auction more than once", async () => {
    const repository = new InMemoryAuctionRepository();
    const auction = createAuction();

    await repository.save(auction);

    const useCase = new CloseAuctionUseCase(repository);

    await useCase.execute({
      auctionId: "auction-001",
      closedAt: new Date("2026-09-05T12:00:00.000Z"),
    });

    await expect(
      useCase.execute({
        auctionId: "auction-001",
        closedAt: new Date("2026-09-05T13:00:00.000Z"),
      }),
    ).rejects.toThrow("Auction can only be closed once");
  });
});