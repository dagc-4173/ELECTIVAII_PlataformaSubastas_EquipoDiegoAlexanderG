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
import { ForbiddenOperationError } from "../errors/ForbiddenOperationError.js";
import { BusinessRuleViolationError } from "../errors/BusinessRuleViolationError.js";

export class Auction {
  private constructor(
    private readonly auctionId: AuctionId,
    private readonly sellerId: UserId,
    private itemId: ItemId,
    private categoryId: CategoryId,
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

  static reconstitute(state: {
    id: AuctionId;
    sellerId: UserId;
    itemId: ItemId;
    categoryId: CategoryId;
    publication: AuctionPublicationData;
    status: AuctionStatus;
    bids: readonly Bid[];
    rejectedAttempts: readonly RejectedBidAttempt[];
    paymentOrder: PaymentOrder | undefined;
  }): Auction {
    const auction = Auction.publish(state.id, state.sellerId, state.itemId, state.categoryId, state.publication);
    for (const bid of state.bids) {
      auction.placeBid(bid, RejectedBidAttemptId.create(`restore-${bid.id.value}`));
    }
    const status = state.status.value;
    const order = state.paymentOrder;
    if (status === "CANCELLED") auction.cancel(state.sellerId);
    if (status === "CLOSED" || status === "DESERTED" || status === "DEFAULTED") {
      auction.close(order?.createdDate ?? state.publication.closesAt, order?.id);
    }
    if (auction.status.value !== (status === "DEFAULTED" ? "CLOSED" : status)) {
      throw new BusinessRuleViolationError("Auction state is inconsistent");
    }
    if (order !== undefined) {
      const generated = auction.paymentOrder;
      if (generated === undefined || !order.winner.equals(generated.winner) ||
          order.amount.value !== generated.amount.value ||
          order.dueDate.getTime() !== generated.dueDate.getTime() ||
          (status === "DEFAULTED") !== (order.status.value === "EXPIRED")) {
        throw new BusinessRuleViolationError("Auction payment order is inconsistent");
      }
    } else if (auction.paymentOrder !== undefined || status === "DEFAULTED") {
      throw new BusinessRuleViolationError("Auction payment order is required");
    }
    auction.statusValue = state.status;
    auction.paymentOrderValue = order;
    auction.rejectedBidAttempts.push(...state.rejectedAttempts);
    return auction;
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

    throw new BusinessRuleViolationError(reason);
  }


  editPublication(requesterId: UserId, item: ItemId, category: CategoryId, now: Date): void {
    if (!requesterId.equals(this.sellerId)) {
      throw new ForbiddenOperationError("Only the auction seller can edit the publication");
    }
    if (!this.statusValue.equals(AuctionStatus.open()) || now >= this.publicationData.closesAt) {
      throw new BusinessRuleViolationError("Only open auctions can be edited");
    }
    if (this.bids.length > 0) {
      throw new BusinessRuleViolationError("Auction with bids cannot be edited");
    }
    this.itemId = item;
    this.categoryId = category;
  }

  cancel(requesterId: UserId): void {
    if (!requesterId.equals(this.sellerId)) {
      throw new ForbiddenOperationError(
        "Only the auction seller can cancel the auction",
      );
    }

    if (!this.statusValue.equals(AuctionStatus.open())) {
      throw new BusinessRuleViolationError(
        "Only open auctions can be cancelled",
      );
    }

    if (this.bids.length > 0) {
      throw new BusinessRuleViolationError(
        "Auction with bids cannot be cancelled",
      );
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
      throw new BusinessRuleViolationError("Auction closing date is invalid");
    }

    if (!this.statusValue.equals(AuctionStatus.open())) {
      throw new BusinessRuleViolationError("Auction can only be closed once");
    }

    if (closedAt.getTime() < this.publicationData.closesAt.getTime()) {
      throw new BusinessRuleViolationError("Auction cannot close before its scheduled closing date");
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
      throw new BusinessRuleViolationError("Auction does not have a payment order");
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
    if (
      !this.statusValue.equals(AuctionStatus.closed()) &&
      !this.statusValue.equals(AuctionStatus.defaulted())
    ) {
      return undefined;
    }

    return this.bids.at(-1)?.bidder;
  }

  get paymentOrder(): PaymentOrder | undefined {
    return this.paymentOrderValue;
  }
}
