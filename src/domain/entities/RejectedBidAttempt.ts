import { Money } from "../value-objects/Money.js";
import { RejectedBidAttemptId } from "../value-objects/RejectedBidAttemptId.js";
import { UserId } from "../value-objects/UserId.js";

export class RejectedBidAttempt {
  private constructor(
    private readonly attemptId: RejectedBidAttemptId,
    private readonly bidderId: UserId,
    private readonly attemptedAmount: Money,
    private readonly rejectionReason: string,
    private readonly attemptedAt: Date,
  ) {}

  static create(
    id: RejectedBidAttemptId,
    bidderId: UserId,
    amount: Money,
    reason: string,
    attemptedAt: Date,
  ): RejectedBidAttempt {
    const normalizedReason = reason.trim();

    if (normalizedReason.length === 0) {
      throw new Error("Rejected bid attempt reason cannot be empty");
    }

    if (Number.isNaN(attemptedAt.getTime())) {
      throw new Error("Rejected bid attempt date is invalid");
    }

    return new RejectedBidAttempt(
      id,
      bidderId,
      amount,
      normalizedReason,
      new Date(attemptedAt),
    );
  }

  get id(): RejectedBidAttemptId {
    return this.attemptId;
  }

  get bidder(): UserId {
    return this.bidderId;
  }

  get amount(): Money {
    return this.attemptedAmount;
  }

  get reason(): string {
    return this.rejectionReason;
  }

  get date(): Date {
    return new Date(this.attemptedAt);
  }
}