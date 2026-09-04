import { AuctionId } from "../value-objects/AuctionId.js";
import { AuctionPublicationData } from "../value-objects/AuctionPublicationData.js";
import { AuctionStatus } from "../value-objects/AuctionStatus.js";
import { CategoryId } from "../value-objects/CategoryId.js";
import { ItemId } from "../value-objects/ItemId.js";
import { UserId } from "../value-objects/UserId.js";
import { Bid } from "./Bid.js";
import { RejectedBidAttempt } from "./RejectedBidAttempt.js";
import { RejectedBidAttemptId } from "../value-objects/RejectedBidAttemptId.js";

export class Auction {
  private constructor(
    private readonly auctionId: AuctionId,
    private readonly sellerId: UserId,
    private readonly itemId: ItemId,
    private readonly categoryId: CategoryId,
    private readonly publicationData: AuctionPublicationData,
    private statusValue: AuctionStatus,
    private readonly bids: Bid[],
    private readonly rejectedBidAttempts: RejectedBidAttempt[],
  ) {}

  static publish(
    id: AuctionId,
    sellerId: UserId,
    itemId: ItemId,
    categoryId: CategoryId,
    publicationData: AuctionPublicationData,
  ): Auction {
    return new Auction(
      id,
      sellerId,
      itemId,
      categoryId,
      publicationData,
      AuctionStatus.open(),
      [],
      [],
    );
  }

  private rejectBid(bid: Bid, reason: string): never {
    const rejectedAttempt = RejectedBidAttempt.create(
      RejectedBidAttemptId.create(bid.id.value),
      bid.bidder,
      bid.amount,
      reason,
      bid.date,
    );

    this.rejectedBidAttempts.push(rejectedAttempt);

    throw new Error(reason);
  }

  cancel(): void {
    if (this.bids.length > 0) {
      throw new Error("Auction with bids cannot be cancelled");
    }

    this.statusValue = AuctionStatus.cancelled();
  }

  placeBid(bid: Bid): void {
    if (!this.statusValue.equals(AuctionStatus.open())) {
      return this.rejectBid(bid, "Bids are only allowed on open auctions");
    }

    if (bid.bidder.equals(this.sellerId)) {
      return this.rejectBid(bid, "Seller cannot bid on own auction");
    }

    if (
      this.bids.length === 0 &&
      bid.amount.value < this.publicationData.basePrice.value
    ) {
      return this.rejectBid(
        bid,
        "First bid must be greater than or equal to base price",
      );
    }

    const currentHighestBid = this.bids.at(-1);

    if (
      currentHighestBid !== undefined &&
      currentHighestBid.bidder.equals(bid.bidder)
    ) {
      return this.rejectBid(
        bid,
        "Highest bidder cannot outbid own leading bid",
      );
    }

    if (currentHighestBid !== undefined) {
      const minimumRequiredAmount =
        currentHighestBid.amount.value +
        this.publicationData.minimumIncrement.value;

      if (bid.amount.value < minimumRequiredAmount) {
        return this.rejectBid(
          bid,
          "Bid must be greater than or equal to current highest bid plus minimum increment",
        );
      }
    }

    this.bids.push(bid);
  }

  get id(): AuctionId {
    return this.auctionId;
  }

  get seller(): UserId {
    return this.sellerId;
  }

  get item(): ItemId {
    return this.itemId;
  }

  get category(): CategoryId {
    return this.categoryId;
  }

  get publication(): AuctionPublicationData {
    return this.publicationData;
  }

  get status(): AuctionStatus {
    return this.statusValue;
  }
  get bidHistory(): readonly Bid[] {
    return [...this.bids];
  }

  get rejectedBidHistory(): readonly RejectedBidAttempt[] {
    return [...this.rejectedBidAttempts];
  }
}