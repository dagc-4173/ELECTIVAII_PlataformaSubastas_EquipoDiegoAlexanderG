import { AuctionId } from "../value-objects/AuctionId.js";
import { AuctionPublicationData } from "../value-objects/AuctionPublicationData.js";
import { AuctionStatus } from "../value-objects/AuctionStatus.js";
import { CategoryId } from "../value-objects/CategoryId.js";
import { ItemId } from "../value-objects/ItemId.js";
import { UserId } from "../value-objects/UserId.js";
import { Bid } from "./Bid.js";
import { RejectedBidAttempt } from "./RejectedBidAttempt.js";
import { RejectedBidAttemptId } from "../value-objects/RejectedBidAttemptId.js";
import { PaymentOrder } from "./PaymentOrder.js";
import { PaymentOrderId } from "../value-objects/PaymentOrderId.js";

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
    private paymentOrderValue?: PaymentOrder,
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
      undefined,
    );
  }

  private rejectBid(
    bid: Bid,
    rejectedAttemptId: RejectedBidAttemptId,
    reason: string,
  ): never {
    const rejectedAttempt = RejectedBidAttempt.create(
      rejectedAttemptId,
      bid.bidder,
      bid.amount,
      reason,
      bid.date,
    );

    this.rejectedBidAttempts.push(rejectedAttempt);

    throw new Error(reason);
  }

  cancel(): void {
    if (!this.statusValue.equals(AuctionStatus.open())) {
      throw new Error("Only open auctions can be cancelled");
    }

    if (this.bids.length > 0) {
      throw new Error("Auction with bids cannot be cancelled");
    }

    this.statusValue = AuctionStatus.cancelled();
  }

  placeBid(bid: Bid, rejectedAttemptId: RejectedBidAttemptId): void {
    if (!this.statusValue.equals(AuctionStatus.open())) {
      return this.rejectBid(
        bid,
        rejectedAttemptId,
        "Bids are only allowed on open auctions",
      );
    }

    if (bid.date.getTime() >= this.publicationData.closesAt.getTime()) {
      return this.rejectBid(
        bid,
        rejectedAttemptId,
        "Bids are not allowed after the auction closing date",
      );
    }

    if (bid.bidder.equals(this.sellerId)) {
      return this.rejectBid(
        bid,
        rejectedAttemptId,
        "Seller cannot bid on own auction",
      );
    }

    if (
      this.bids.length === 0 &&
      bid.amount.value < this.publicationData.basePrice.value
    ) {
      return this.rejectBid(
        bid,
        rejectedAttemptId,
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
        rejectedAttemptId,
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
          rejectedAttemptId,
          "Bid must be greater than or equal to current highest bid plus minimum increment",
        );
      }
    }

    this.bids.push(bid);
  }

  close(closedAt: Date, paymentOrderId?: PaymentOrderId): void {
    if (Number.isNaN(closedAt.getTime())) {
      throw new Error("Auction closing date is invalid");
    }

    if (!this.statusValue.equals(AuctionStatus.open())) {
      throw new Error("Auction can only be closed once");
    }

    if (closedAt.getTime() < this.publicationData.closesAt.getTime()) {
      throw new Error("Auction cannot close before its scheduled closing date");
    }

    if (this.bids.length === 0) {
      this.statusValue = AuctionStatus.deserted();
      return;
    }

    if (paymentOrderId === undefined) {
      throw new Error(
        "Payment order id is required when closing an auction with bids",
      );
    }

    const highestBid = this.bids.at(-1);

    if (highestBid === undefined) {
      throw new Error("Highest bid is required to close the auction");
    }

    this.paymentOrderValue = PaymentOrder.create(
      paymentOrderId,
      highestBid.bidder,
      highestBid.amount,
      closedAt,
    );

    this.statusValue = AuctionStatus.closed();
  }

  expirePayment(currentDate: Date): void {
    if (this.paymentOrderValue === undefined) {
      throw new Error("Auction does not have a payment order");
    }

    this.paymentOrderValue.expire(currentDate);
    this.statusValue = AuctionStatus.defaulted();
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

  get winner(): UserId | undefined {
    if (!this.statusValue.equals(AuctionStatus.closed())) {
      return undefined;
    }

    return this.bids.at(-1)?.bidder;
  }

  get paymentOrder(): PaymentOrder | undefined {
    return this.paymentOrderValue;
  }
}