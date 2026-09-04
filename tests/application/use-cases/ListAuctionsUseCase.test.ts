import { describe, expect, it } from "vitest";

import { ListAuctionsUseCase } from "../../../src/application/use-cases/ListAuctionsUseCase.js";
import { InMemoryAuctionRepository } from "../../../src/infrastructure/persistence/memory/InMemoryAuctionRepository.js";
import { Auction } from "../../../src/domain/entities/Auction.js";
import { AuctionId } from "../../../src/domain/value-objects/AuctionId.js";
import { AuctionPublicationData } from "../../../src/domain/value-objects/AuctionPublicationData.js";
import { CategoryId } from "../../../src/domain/value-objects/CategoryId.js";
import { ItemId } from "../../../src/domain/value-objects/ItemId.js";
import { Money } from "../../../src/domain/value-objects/Money.js";
import { UserId } from "../../../src/domain/value-objects/UserId.js";

function createAuction(id: string): Auction {
  return Auction.publish(
    AuctionId.create(id),
    UserId.create("seller-001"),
    ItemId.create(`item-${id}`),
    CategoryId.create("category-001"),
    AuctionPublicationData.create(
      Money.create(100000),
      Money.create(5000),
      new Date("2026-09-04T12:00:00.000Z"),
      new Date("2026-09-05T12:00:00.000Z"),
    ),
  );
}

describe("ListAuctionsUseCase", () => {
  it("should return all stored auctions", async () => {
    const repository = new InMemoryAuctionRepository();

    const auction1 = createAuction("auction-001");
    const auction2 = createAuction("auction-002");

    await repository.save(auction1);
    await repository.save(auction2);

    const useCase = new ListAuctionsUseCase(repository);

    const result = await useCase.execute();

    expect(result).toHaveLength(2);
    expect(result).toContain(auction1);
    expect(result).toContain(auction2);
  });

  it("should return an empty list when no auctions exist", async () => {
    const repository = new InMemoryAuctionRepository();
    const useCase = new ListAuctionsUseCase(repository);

    const result = await useCase.execute();

    expect(result).toEqual([]);
  });
});