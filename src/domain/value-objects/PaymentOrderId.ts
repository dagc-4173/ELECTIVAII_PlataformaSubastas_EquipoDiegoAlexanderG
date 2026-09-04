export class PaymentOrderId {
  private constructor(private readonly id: string) {}

  static create(id: string): PaymentOrderId {
    const value = id.trim();

    if (value.length === 0) {
      throw new Error("Payment order id cannot be empty");
    }

    return new PaymentOrderId(value);
  }

  get value(): string {
    return this.id;
  }

  equals(other: PaymentOrderId): boolean {
    return this.id === other.id;
  }
}