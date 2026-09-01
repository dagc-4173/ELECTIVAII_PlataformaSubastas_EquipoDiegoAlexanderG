export class Money {
  private constructor(private readonly amount: number) {}

  static create(amount: number): Money {
    if (!Number.isInteger(amount)) {
      throw new Error("Money amount must be an integer");
    }

    if (amount < 0) {
      throw new Error("Money amount cannot be negative");
    }

    return new Money(amount);
  }

  get value(): number {
    return this.amount;
  }

  equals(other: Money): boolean {
    return this.amount === other.amount;
  }
}