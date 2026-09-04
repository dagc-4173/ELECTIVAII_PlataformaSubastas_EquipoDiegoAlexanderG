export class PaymentEventId {
  private constructor(private readonly id: string) {}

  static create(id: string): PaymentEventId {
    const value = id.trim();

    if (value.length === 0) {
      throw new Error("Payment event id cannot be empty");
    }

    return new PaymentEventId(value);
  }

  get value(): string {
    return this.id;
  }

  equals(other: PaymentEventId): boolean {
    return this.id === other.id;
  }
}