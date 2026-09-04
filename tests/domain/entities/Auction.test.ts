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
import { PaymentOrderId } from "../../../src/domain/value-objects/PaymentOrderId.js";

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

  it("RN-04 should reject cancellation when the auction already has bids", () => {
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

    auction.placeBid(
      Bid.create(
        BidId.create("bid-001"),
        UserId.create("bidder-001"),
        Money.create(100000),
        new Date("2026-09-03T19:00:00.000Z"),
      ),
    );

    expect(() => auction.cancel()).toThrow(
      "Auction with bids cannot be cancelled",
    );

    expect(auction.status.value).toBe("OPEN");
    expect(auction.bidHistory).toHaveLength(1);
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

  it("RN-06 and RN-12 should reject and record a bid when the auction is not open", () => {
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

    expect(auction.rejectedBidHistory).toHaveLength(1);
    expect(auction.rejectedBidHistory[0]?.id.value).toBe("bid-001");
    expect(auction.rejectedBidHistory[0]?.bidder.value).toBe("bidder-001");
    expect(auction.rejectedBidHistory[0]?.amount.value).toBe(100000);
    expect(auction.rejectedBidHistory[0]?.reason).toBe(
      "Bids are only allowed on open auctions",
    );
  });

  it("RN-07 and RN-12 should reject and record a bid from the auction seller", () => {
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

    expect(auction.rejectedBidHistory).toHaveLength(1);
    expect(auction.rejectedBidHistory[0]?.id.value).toBe("bid-001");
    expect(auction.rejectedBidHistory[0]?.bidder.value).toBe("seller-001");
    expect(auction.rejectedBidHistory[0]?.amount.value).toBe(100000);
    expect(auction.rejectedBidHistory[0]?.reason).toBe(
      "Seller cannot bid on own auction",
    );
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

  it("RN-08 and RN-12 should reject and record the first bid when it is below the base price", () => {
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

    expect(auction.rejectedBidHistory).toHaveLength(1);
    expect(auction.rejectedBidHistory[0]?.id.value).toBe("bid-001");
    expect(auction.rejectedBidHistory[0]?.bidder.value).toBe("bidder-001");
    expect(auction.rejectedBidHistory[0]?.amount.value).toBe(99999);
    expect(auction.rejectedBidHistory[0]?.reason).toBe(
      "First bid must be greater than or equal to base price",
    );
  });

  it("RN-09 should accept a bid equal to the current highest bid plus minimum increment", () => {
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

    auction.placeBid(
      Bid.create(
        BidId.create("bid-001"),
        UserId.create("bidder-001"),
        Money.create(100000),
        new Date("2026-09-03T19:00:00.000Z"),
      ),
    );

    auction.placeBid(
      Bid.create(
        BidId.create("bid-002"),
        UserId.create("bidder-002"),
        Money.create(105000),
        new Date("2026-09-03T19:05:00.000Z"),
      ),
    );

    expect(auction.bidHistory).toHaveLength(2);
    expect(auction.bidHistory[1]?.amount.value).toBe(105000);
  });

  it("RN-09 and RN-12 should reject and record a bid below the required minimum", () => {
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

    auction.placeBid(
      Bid.create(
        BidId.create("bid-001"),
        UserId.create("bidder-001"),
        Money.create(100000),
        new Date("2026-09-03T19:00:00.000Z"),
      ),
    );

    const invalidBid = Bid.create(
      BidId.create("bid-002"),
      UserId.create("bidder-002"),
      Money.create(104999),
      new Date("2026-09-03T19:05:00.000Z"),
    );

    expect(() => auction.placeBid(invalidBid)).toThrow(
      "Bid must be greater than or equal to current highest bid plus minimum increment",
    );

    expect(auction.bidHistory).toHaveLength(1);

    expect(auction.rejectedBidHistory).toHaveLength(1);
    expect(auction.rejectedBidHistory[0]?.id.value).toBe("bid-002");
    expect(auction.rejectedBidHistory[0]?.bidder.value).toBe("bidder-002");
    expect(auction.rejectedBidHistory[0]?.amount.value).toBe(104999);
    expect(auction.rejectedBidHistory[0]?.reason).toBe(
      "Bid must be greater than or equal to current highest bid plus minimum increment",
    );
  });

  it("RN-09 should reject a bid equal to the current highest bid", () => {
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

    auction.placeBid(
      Bid.create(
        BidId.create("bid-001"),
        UserId.create("bidder-001"),
        Money.create(100000),
        new Date("2026-09-03T19:00:00.000Z"),
      ),
    );

    const equalBid = Bid.create(
      BidId.create("bid-002"),
      UserId.create("bidder-002"),
      Money.create(100000),
      new Date("2026-09-03T19:05:00.000Z"),
    );

    expect(() => auction.placeBid(equalBid)).toThrow(
      "Bid must be greater than or equal to current highest bid plus minimum increment",
    );

    expect(auction.bidHistory).toHaveLength(1);
  });

  it("RN-10 and RN-12 should reject and record a bid from the current highest bidder", () => {
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

    auction.placeBid(
      Bid.create(
        BidId.create("bid-001"),
        UserId.create("bidder-001"),
        Money.create(100000),
        new Date("2026-09-03T19:00:00.000Z"),
      ),
    );

    const ownHigherBid = Bid.create(
      BidId.create("bid-002"),
      UserId.create("bidder-001"),
      Money.create(105000),
      new Date("2026-09-03T19:05:00.000Z"),
    );

    expect(() => auction.placeBid(ownHigherBid)).toThrow(
      "Highest bidder cannot outbid own leading bid",
    );

    expect(auction.bidHistory).toHaveLength(1);

    expect(auction.rejectedBidHistory).toHaveLength(1);
    expect(auction.rejectedBidHistory[0]?.id.value).toBe("bid-002");
    expect(auction.rejectedBidHistory[0]?.bidder.value).toBe("bidder-001");
    expect(auction.rejectedBidHistory[0]?.amount.value).toBe(105000);
    expect(auction.rejectedBidHistory[0]?.reason).toBe(
      "Highest bidder cannot outbid own leading bid",
    );
  });

  it("RN-11 should keep an accepted bid irrevocably in the auction history", () => {
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

    auction.placeBid(
      Bid.create(
        BidId.create("bid-001"),
        UserId.create("bidder-001"),
        Money.create(100000),
        new Date("2026-09-03T19:00:00.000Z"),
      ),
    );

    const externalHistory = auction.bidHistory;

    expect(externalHistory).toHaveLength(1);
    expect(externalHistory[0]?.id.value).toBe("bid-001");

    expect(auction.bidHistory).toHaveLength(1);
    expect(auction.bidHistory[0]?.id.value).toBe("bid-001");
  });

  it("should reject closing before the scheduled closing date", () => {
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

    expect(() => auction.close(new Date("2026-09-04T17:59:59.000Z"))).toThrow(
      "Auction cannot close before its scheduled closing date",
    );

    expect(auction.status.value).toBe("OPEN");
  });

  it("RN-13 should close the auction and assign the highest bidder as winner", () => {
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

    auction.placeBid(
      Bid.create(
        BidId.create("bid-001"),
        UserId.create("bidder-001"),
        Money.create(100000),
        new Date("2026-09-03T19:00:00.000Z"),
      ),
    );

    auction.placeBid(
      Bid.create(
        BidId.create("bid-002"),
        UserId.create("bidder-002"),
        Money.create(105000),
        new Date("2026-09-03T19:05:00.000Z"),
      ),
    );

    auction.close(
      new Date("2026-09-04T18:00:00.000Z"),
      PaymentOrderId.create("payment-order-001"),
    );

    expect(auction.status.value).toBe("CLOSED");
    expect(auction.winner?.value).toBe("bidder-002");
    expect(auction.bidHistory.at(-1)?.amount.value).toBe(105000);
  });

  it("RN-14 should mark an auction without bids as deserted", () => {
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

    auction.close(new Date("2026-09-04T18:00:00.000Z"));

    expect(auction.status.value).toBe("DESERTED");
    expect(auction.winner).toBeUndefined();
    expect(auction.bidHistory).toHaveLength(0);
  });

  it("RN-15 should generate a payment order for the winning bid with a 48-hour deadline", () => {
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

    auction.placeBid(
      Bid.create(
        BidId.create("bid-001"),
        UserId.create("bidder-001"),
        Money.create(100000),
        new Date("2026-09-03T19:00:00.000Z"),
      ),
    );

    auction.placeBid(
      Bid.create(
        BidId.create("bid-002"),
        UserId.create("bidder-002"),
        Money.create(105000),
        new Date("2026-09-03T19:05:00.000Z"),
      ),
    );

    const closedAt = new Date("2026-09-04T18:00:00.000Z");

    auction.close(closedAt, PaymentOrderId.create("payment-order-001"));

    expect(auction.paymentOrder).toBeDefined();
    expect(auction.paymentOrder?.id.value).toBe("payment-order-001");
    expect(auction.paymentOrder?.winner.value).toBe("bidder-002");
    expect(auction.paymentOrder?.amount.value).toBe(105000);
    expect(auction.paymentOrder?.createdDate.toISOString()).toBe(
      "2026-09-04T18:00:00.000Z",
    );
    expect(auction.paymentOrder?.dueDate.toISOString()).toBe(
      "2026-09-06T18:00:00.000Z",
    );
  });

  it("RN-16 should reject closing the same auction more than once", () => {
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

    auction.placeBid(
      Bid.create(
        BidId.create("bid-001"),
        UserId.create("bidder-001"),
        Money.create(100000),
        new Date("2026-09-03T19:00:00.000Z"),
      ),
    );

    auction.close(
      new Date("2026-09-04T18:00:00.000Z"),
      PaymentOrderId.create("payment-order-001"),
    );

    expect(auction.status.value).toBe("CLOSED");

    expect(() =>
      auction.close(
        new Date("2026-09-04T18:05:00.000Z"),
        PaymentOrderId.create("payment-order-002"),
      ),
    ).toThrow("Auction can only be closed once");

    expect(auction.status.value).toBe("CLOSED");
    expect(auction.winner?.value).toBe("bidder-001");
    expect(auction.paymentOrder).toBeDefined();
    expect(auction.paymentOrder?.id.value).toBe("payment-order-001");
    expect(auction.paymentOrder?.winner.value).toBe("bidder-001");
    expect(auction.paymentOrder?.amount.value).toBe(100000);
  });
});