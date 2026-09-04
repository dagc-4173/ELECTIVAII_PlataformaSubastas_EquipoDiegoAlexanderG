export type PaymentOrderStatusValue =
  | "PENDING"
  | "CONFIRMED"
  | "EXPIRED";

export class PaymentOrderStatus {
  private constructor(
    private readonly status: PaymentOrderStatusValue,
  ) {}

  static pending(): PaymentOrderStatus {
    return new PaymentOrderStatus("PENDING");
  }

  static confirmed(): PaymentOrderStatus {
    return new PaymentOrderStatus("CONFIRMED");
  }

  static expired(): PaymentOrderStatus {
    return new PaymentOrderStatus("EXPIRED");
  }

  get value(): PaymentOrderStatusValue {
    return this.status;
  }

  equals(other: PaymentOrderStatus): boolean {
    return this.status === other.status;
  }
}