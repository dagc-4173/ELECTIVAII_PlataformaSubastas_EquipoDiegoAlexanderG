import { BusinessRuleViolationError } from "../errors/BusinessRuleViolationError.js";

export class BidId {
  private constructor(private readonly id: string) {}

  static create(id: string): BidId {
    const value = id.trim();

    if (value.length === 0) {
      throw new BusinessRuleViolationError("Bid id cannot be empty");
    }

    return new BidId(value);
  }

  get value(): string {
    return this.id;
  }

  equals(other: BidId): boolean {
    return this.id === other.id;
  }
}