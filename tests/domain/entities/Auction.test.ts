import { describe, expect, it } from "vitest";

import { Auction } from "../../../src/domain/entities/Auction.js";
import { AuctionId } from "../../../src/domain/value-objects/AuctionId.js";
import { AuctionPublicationData } from "../../../src/domain/value-objects/AuctionPublicationData.js";
import { CategoryId } from "../../../src/domain/value-objects/CategoryId.js";
import { ItemId } from "../../../src/domain/value-objects/ItemId.js";
import { Money } from "../../../src/domain/value-objects/Money.js";
import { UserId } from "../../../src/domain/value-objects/UserId.js";

describe("Auction", () => {
  it("should publish an auction with valid data", () => {
    const publicationData = AuctionPublicationData.create(
      Money.create(100000),
      Money.create(5000),
      new Date("2026-09-03T18:00:00.000Z"),
      new Date("2026-09-04T18:00:00.000Z"),
    );

    const auction = Auction.publish(
      AuctionId.create("auction-001"),
      UserId.create("seller-001"),
      ItemId.create("item-001"),
      CategoryId.create("category-001"),
      publicationData,
    );

    expect(auction.id.value).toBe("auction-001");
    expect(auction.seller.value).toBe("seller-001");
    expect(auction.item.value).toBe("item-001");
    expect(auction.category.value).toBe("category-001");
  });

  it("should start in OPEN status when published", () => {
    const auction = Auction.publish(
      AuctionId.create("auction-001"),
      UserId.create("seller-001"),
      ItemId.create("item-001"),
      CategoryId.create("category-001"),
      AuctionPublicationData.create(
        Money.create(100000),
        Money.create(5000),
        new Date("2026-09-03T18:00:00.000Z"),
        new Date("2026-09-04T18:00:00.000Z"),
      ),
    );

    expect(auction.status.value).toBe("OPEN");
  });

  it("should preserve publication data", () => {
    const publicationData = AuctionPublicationData.create(
      Money.create(100000),
      Money.create(5000),
      new Date("2026-09-03T18:00:00.000Z"),
      new Date("2026-09-04T18:00:00.000Z"),
    );

    const auction = Auction.publish(
      AuctionId.create("auction-001"),
      UserId.create("seller-001"),
      ItemId.create("item-001"),
      CategoryId.create("category-001"),
      publicationData,
    );

    expect(auction.publication.basePrice.value).toBe(100000);
    expect(auction.publication.minimumIncrement.value).toBe(5000);
    expect(auction.publication.publishedAt.toISOString()).toBe(
      "2026-09-03T18:00:00.000Z",
    );
    expect(auction.publication.closesAt.toISOString()).toBe(
      "2026-09-04T18:00:00.000Z",
    );
  });
  
  it("RN-04 should cancel an auction when it has no bids", () => {
    const auction = Auction.publish(
        AuctionId.create("auction-001"),
        UserId.create("seller-001"),
        ItemId.create("item-001"),
        CategoryId.create("category-001"),
        AuctionPublicationData.create(
        Money.create(100000),
        Money.create(5000),
        new Date("2026-09-03T18:00:00.000Z"),
        new Date("2026-09-04T18:00:00.000Z"),
        ),
    );

    auction.cancel();

    expect(auction.status.value).toBe("CANCELLED");
    expect(auction.bidHistory).toHaveLength(0);
  });
});