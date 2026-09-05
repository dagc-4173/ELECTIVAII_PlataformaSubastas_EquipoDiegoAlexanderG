import { describe, expect, it } from "vitest";

import { GetAuctionUseCase } from "../../../src/application/use-cases/GetAuctionUseCase.js";
import { InMemoryAuctionRepository } from "../../../src/infrastructure/persistence/memory/InMemoryAuctionRepository.js";
import { Auction } from "../../../src/domain/entities/Auction.js";
import { AuctionId } from "../../../src/domain/value-objects/AuctionId.js";
import { AuctionPublicationData } from "../../../src/domain/value-objects/AuctionPublicationData.js";
import { CategoryId } from "../../../src/domain/value-objects/CategoryId.js";
import { ItemId } from "../../../src/domain/value-objects/ItemId.js";
import { Money } from "../../../src/domain/value-objects/Money.js";
import { UserId } from "../../../src/domain/value-objects/UserId.js";
import { Bid } from "../../../src/domain/entities/Bid.js";
import { BidId } from "../../../src/domain/value-objects/BidId.js";
import { RejectedBidAttemptId } from "../../../src/domain/value-objects/RejectedBidAttemptId.js";

class FakeIdGenerator {
  generate(): string {
    return "payment-order-001";
  }
}

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

describe("GetAuctionUseCase", () => {
  it("should return an auction when it exists", async () => {
    const repository = new InMemoryAuctionRepository();
    const auction = createAuction();

    await repository.save(auction);

    const useCase = new GetAuctionUseCase(repository, new FakeIdGenerator());

    const result = await useCase.execute({
      auctionId: "auction-001",
      currentDate: new Date("2026-09-04T13:00:00.000Z"),
    });

    expect(result).toBe(auction);
  });

  it("should return null when the auction does not exist", async () => {
    const repository = new InMemoryAuctionRepository();
    const useCase = new GetAuctionUseCase(repository, new FakeIdGenerator());

    const result = await useCase.execute({
      auctionId: "auction-404",
      currentDate: new Date("2026-09-04T13:00:00.000Z"),
    });

    expect(result).toBeNull();
  });

  it("should lazily close an expired auction without bids as deserted", async () => {
    const repository = new InMemoryAuctionRepository();
    const auction = createAuction();

    await repository.save(auction);

    const useCase = new GetAuctionUseCase(repository, new FakeIdGenerator());

    const result = await useCase.execute({
      auctionId: "auction-001",
      currentDate: new Date("2026-09-05T12:00:00.000Z"),
    });

    expect(result?.status.value).toBe("DESERTED");
  });

  it("should lazily close an expired auction with bids and adjudicate it", async () => {
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

    const useCase = new GetAuctionUseCase(repository, new FakeIdGenerator());

    const result = await useCase.execute({
      auctionId: "auction-001",
      currentDate: new Date("2026-09-05T12:00:00.000Z"),
    });

    expect(result?.status.value).toBe("CLOSED");
    expect(result?.winner?.value).toBe("bidder-001");
    expect(result?.paymentOrder).toBeDefined();
  });

  it("should generate a payment order id when lazily closing an auction with bids", async () => {
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

    const useCase = new GetAuctionUseCase(repository, new FakeIdGenerator());

    const result = await useCase.execute({
      auctionId: "auction-001",
      currentDate: new Date("2026-09-05T12:00:00.000Z"),
    });

    expect(result?.status.value).toBe("CLOSED");
    expect(result?.paymentOrder?.id.value).toBe("payment-order-001");
    expect(result?.winner?.value).toBe("bidder-001");
  });
});