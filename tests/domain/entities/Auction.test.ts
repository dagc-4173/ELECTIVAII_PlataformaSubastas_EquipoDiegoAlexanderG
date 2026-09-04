import { describe, expect, it } from "vitest";

import { Auction } from "../../../src/domain/entities/Auction.js";
import { AuctionId } from "../../../src/domain/value-objects/AuctionId.js";
import { AuctionPublicationData } from "../../../src/domain/value-objects/AuctionPublicationData.js";
import { CategoryId } from "../../../src/domain/value-objects/CategoryId.js";
import { ItemId } from "../../../src/domain/value-objects/ItemId.js";
import { Money } from "../../../src/domain/value-objects/Money.js";
import { UserId } from "../../../src/domain/value-objects/UserId.js";
import { Bid } from "../../../src/domain/entities/Bid.js";
import { BidId } from "../../../src/domain/value-objects/BidId.js";

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
  
  it("RN-06 should accept a bid when the auction is open", () => {
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

    const bid = Bid.create(
        BidId.create("bid-001"),
        UserId.create("bidder-001"),
        Money.create(100000),
        new Date("2026-09-03T19:00:00.000Z"),
    );

    auction.placeBid(bid);

    expect(auction.bidHistory).toHaveLength(1);
    expect(auction.bidHistory[0]?.id.value).toBe("bid-001");
  });

  it("RN-06 should reject a bid when the auction is not open", () => {
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

    const bid = Bid.create(
      BidId.create("bid-001"),
      UserId.create("bidder-001"),
      Money.create(100000),
      new Date("2026-09-03T19:00:00.000Z"),
    );

    expect(() => auction.placeBid(bid)).toThrow(
      "Bids are only allowed on open auctions",
    );

    expect(auction.bidHistory).toHaveLength(0);
  });

  it("RN-07 should reject a bid from the auction seller", () => {
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

    const bid = Bid.create(
      BidId.create("bid-001"),
      UserId.create("seller-001"),
      Money.create(100000),
      new Date("2026-09-03T19:00:00.000Z"),
    );

    expect(() => auction.placeBid(bid)).toThrow(
      "Seller cannot bid on own auction",
    );

    expect(auction.bidHistory).toHaveLength(0);
  });

  it("RN-08 should accept the first bid when it is equal to the base price", () => {
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

    const bid = Bid.create(
      BidId.create("bid-001"),
      UserId.create("bidder-001"),
      Money.create(100000),
      new Date("2026-09-03T19:00:00.000Z"),
    );

    auction.placeBid(bid);

    expect(auction.bidHistory).toHaveLength(1);
    expect(auction.bidHistory[0]?.amount.value).toBe(100000);
  });

  it("RN-08 should reject the first bid when it is below the base price", () => {
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

    const bid = Bid.create(
      BidId.create("bid-001"),
      UserId.create("bidder-001"),
      Money.create(99999),
      new Date("2026-09-03T19:00:00.000Z"),
    );

    expect(() => auction.placeBid(bid)).toThrow(
      "First bid must be greater than or equal to base price",
    );

    expect(auction.bidHistory).toHaveLength(0);
  });
});