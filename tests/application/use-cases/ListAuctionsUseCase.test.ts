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

function createAuction(
  id: string,
  categoryId: string,
): Auction {
  return Auction.publish(
    AuctionId.create(id),
    UserId.create("seller-001"),
    ItemId.create(`item-${id}`),
    CategoryId.create(categoryId),
    AuctionPublicationData.create(
      Money.create(100000),
      Money.create(5000),
      new Date("2026-09-05T12:00:00.000Z"),
      new Date("2026-09-06T12:00:00.000Z"),
    ),
  );
}

describe("ListAuctionsUseCase - RF-05", () => {
  it("should return paginated auctions", async () => {
    const repository = new InMemoryAuctionRepository();

    await repository.save(createAuction("auction-001", "category-001"));
    await repository.save(createAuction("auction-002", "category-001"));
    await repository.save(createAuction("auction-003", "category-002"));

    const useCase = new ListAuctionsUseCase(repository);

    const result = await useCase.execute({
      page: 1,
      pageSize: 2,
    });

    expect(result.items).toHaveLength(2);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(2);
    expect(result.totalItems).toBe(3);
    expect(result.totalPages).toBe(2);
  });

  it("should return the second page of auctions", async () => {
    const repository = new InMemoryAuctionRepository();

    await repository.save(createAuction("auction-001", "category-001"));
    await repository.save(createAuction("auction-002", "category-001"));
    await repository.save(createAuction("auction-003", "category-002"));

    const useCase = new ListAuctionsUseCase(repository);

    const result = await useCase.execute({
      page: 2,
      pageSize: 2,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id.value).toBe("auction-003");
    expect(result.totalItems).toBe(3);
    expect(result.totalPages).toBe(2);
  });

  it("should filter auctions by category", async () => {
    const repository = new InMemoryAuctionRepository();

    await repository.save(createAuction("auction-001", "category-001"));
    await repository.save(createAuction("auction-002", "category-002"));
    await repository.save(createAuction("auction-003", "category-002"));

    const useCase = new ListAuctionsUseCase(repository);

    const result = await useCase.execute({
      categoryId: "category-002",
      page: 1,
      pageSize: 10,
    });

    expect(result.items).toHaveLength(2);

    expect(
      result.items.every(
        (auction) => auction.category.value === "category-002",
      ),
    ).toBe(true);

    expect(result.totalItems).toBe(2);
  });

  it("should filter auctions by status", async () => {
    const repository = new InMemoryAuctionRepository();

    const openAuction = createAuction(
      "auction-001",
      "category-001",
    );

    const cancelledAuction = createAuction(
      "auction-002",
      "category-001",
    );

    cancelledAuction.cancel();

    await repository.save(openAuction);
    await repository.save(cancelledAuction);

    const useCase = new ListAuctionsUseCase(repository);

    const result = await useCase.execute({
      status: "CANCELLED",
      page: 1,
      pageSize: 10,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id.value).toBe("auction-002");
    expect(result.items[0]?.status.value).toBe("CANCELLED");
  });

  it("should combine category and status filters", async () => {
    const repository = new InMemoryAuctionRepository();

    const auction1 = createAuction(
      "auction-001",
      "category-001",
    );

    const auction2 = createAuction(
      "auction-002",
      "category-002",
    );

    const auction3 = createAuction(
      "auction-003",
      "category-002",
    );

    auction3.cancel();

    await repository.save(auction1);
    await repository.save(auction2);
    await repository.save(auction3);

    const useCase = new ListAuctionsUseCase(repository);

    const result = await useCase.execute({
      categoryId: "category-002",
      status: "CANCELLED",
      page: 1,
      pageSize: 10,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id.value).toBe("auction-003");
  });

  it("should return an empty page when no auctions match the filters", async () => {
    const repository = new InMemoryAuctionRepository();

    await repository.save(createAuction("auction-001", "category-001"));

    const useCase = new ListAuctionsUseCase(repository);

    const result = await useCase.execute({
      categoryId: "category-999",
      page: 1,
      pageSize: 10,
    });

    expect(result.items).toEqual([]);
    expect(result.totalItems).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  it("should reject an invalid page number", async () => {
    const repository = new InMemoryAuctionRepository();
    const useCase = new ListAuctionsUseCase(repository);

    await expect(
      useCase.execute({
        page: 0,
        pageSize: 10,
      }),
    ).rejects.toThrow("Page must be a positive integer");
  });

  it("should reject an invalid page size", async () => {
    const repository = new InMemoryAuctionRepository();
    const useCase = new ListAuctionsUseCase(repository);

    await expect(
      useCase.execute({
        page: 1,
        pageSize: 0,
      }),
    ).rejects.toThrow("Page size must be a positive integer");
  });
});