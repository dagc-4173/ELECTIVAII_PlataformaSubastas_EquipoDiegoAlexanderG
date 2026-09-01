import { BidId } from "../value-objects/BidId.js";
import { Money } from "../value-objects/Money.js";
import { UserId } from "../value-objects/UserId.js";

export class Bid {
  private constructor(
    private readonly bidId: BidId,
    private readonly bidderId: UserId,
    private readonly bidAmount: Money,
    private readonly placedAt: Date,
  ) {}

  static create(
    id: BidId,
    bidderId: UserId,
    amount: Money,
    placedAt: Date,
  ): Bid {
    if (Number.isNaN(placedAt.getTime())) {
      throw new Error("Bid placement date is invalid");
    }

    return new Bid(id, bidderId, amount, new Date(placedAt));
  }

  get id(): BidId {
    return this.bidId;
  }

  get bidder(): UserId {
    return this.bidderId;
  }

  get amount(): Money {
    return this.bidAmount;
  }

  get date(): Date {
    return new Date(this.placedAt);
  }
}