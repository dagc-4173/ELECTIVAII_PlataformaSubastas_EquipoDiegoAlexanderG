import { describe, expect, it } from "vitest";

import { InMemoryAuctionRepository } from "../../../../src/infrastructure/persistence/memory/InMemoryAuctionRepository.js";
import { Auction } from "../../../../src/domain/entities/Auction.js";
import { AuctionId } from "../../../../src/domain/value-objects/AuctionId.js";
import { AuctionPublicationData } from "../../../../src/domain/value-objects/AuctionPublicationData.js";
import { CategoryId } from "../../../../src/domain/value-objects/CategoryId.js";
import { ItemId } from "../../../../src/domain/value-objects/ItemId.js";
import { Money } from "../../../../src/domain/value-objects/Money.js";
import { UserId } from "../../../../src/domain/value-objects/UserId.js";

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

describe("InMemoryAuctionRepository", () => {
  it("should save and retrieve an auction by id", async () => {
    const repository = new InMemoryAuctionRepository();
    const auction = createAuction();

    await repository.save(auction);

    const storedAuction = await repository.findById(
      AuctionId.create("auction-001"),
    );

    expect(storedAuction).toBe(auction);
  });

  it("should list all stored auctions", async () => {
    const repository = new InMemoryAuctionRepository();
    const auction = createAuction();

    await repository.save(auction);

    const auctions = await repository.findAll();

    expect(auctions).toHaveLength(1);
    expect(auctions[0]).toBe(auction);
  });

  it("should not duplicate an auction when saving the same aggregate again", async () => {
    const repository = new InMemoryAuctionRepository();
    const auction = createAuction();

    await repository.save(auction);
    await repository.save(auction);

    const auctions = await repository.findAll();

    expect(auctions).toHaveLength(1);
  });
});