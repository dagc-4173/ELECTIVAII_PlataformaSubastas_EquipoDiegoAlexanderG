import { Money } from "./Money.js";
import { BusinessRuleViolationError } from "../errors/BusinessRuleViolationError.js";

export class AuctionPublicationData {
  private constructor(
    private readonly basePriceValue: Money,
    private readonly minimumIncrementValue: Money,
    private readonly publishedAtValue: Date,
    private readonly closesAtValue: Date,
  ) {}

  static create(
    basePrice: Money,
    minimumIncrement: Money,
    publishedAt: Date,
    closesAt: Date,
  ): AuctionPublicationData {
    if (basePrice.value <= 0) {
      throw new BusinessRuleViolationError(
        "Auction base price must be greater than zero",
      );
    }

    if (minimumIncrement.value <= 0) {
      throw new BusinessRuleViolationError(
        "Auction minimum increment must be greater than zero",
      );
    }

    if (Number.isNaN(publishedAt.getTime())) {
      throw new BusinessRuleViolationError(
        "Auction publication date is invalid",
      );
    }

    if (Number.isNaN(closesAt.getTime())) {
      throw new BusinessRuleViolationError(
        "Auction closing date is invalid",
      );
    }

    if (closesAt.getTime() <= publishedAt.getTime()) {
      throw new BusinessRuleViolationError(
        "Auction closing date must be after publication date",
      );
    }

    const durationInMilliseconds =
      closesAt.getTime() - publishedAt.getTime();

    const oneHourInMilliseconds = 60 * 60 * 1000;
    const thirtyDaysInMilliseconds = 30 * 24 * 60 * 60 * 1000;

    if (durationInMilliseconds < oneHourInMilliseconds) {
      throw new BusinessRuleViolationError(
        "Auction duration must be at least one hour",
      );
    }

    if (durationInMilliseconds > thirtyDaysInMilliseconds) {
      throw new BusinessRuleViolationError(
        "Auction duration cannot exceed thirty days",
      );
    }

    return new AuctionPublicationData(
      basePrice,
      minimumIncrement,
      new Date(publishedAt),
      new Date(closesAt),
    );
  }

  get basePrice(): Money {
    return this.basePriceValue;
  }

  get minimumIncrement(): Money {
    return this.minimumIncrementValue;
  }

  get publishedAt(): Date {
    return new Date(this.publishedAtValue);
  }

  get closesAt(): Date {
    return new Date(this.closesAtValue);
  }
}