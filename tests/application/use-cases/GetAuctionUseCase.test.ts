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

    const useCase = new GetAuctionUseCase(repository);

    const result = await useCase.execute("auction-001");

    expect(result).toBe(auction);
  });

  it("should return null when the auction does not exist", async () => {
    const repository = new InMemoryAuctionRepository();
    const useCase = new GetAuctionUseCase(repository);

    const result = await useCase.execute("auction-404");

    expect(result).toBeNull();
  });
});