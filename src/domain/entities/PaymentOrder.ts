import { Money } from "../value-objects/Money.js";
import { PaymentOrderId } from "../value-objects/PaymentOrderId.js";
import { UserId } from "../value-objects/UserId.js";
import { PaymentOrderStatus } from "../value-objects/PaymentOrderStatus.js";

export class PaymentOrder {
  private constructor(
    private readonly orderId: PaymentOrderId,
    private readonly winnerId: UserId,
    private readonly orderAmount: Money,
    private readonly createdAt: Date,
    private readonly dueAt: Date,
    private statusValue: PaymentOrderStatus,
  ) {}

  static create(
    id: PaymentOrderId,
    winnerId: UserId,
    amount: Money,
    createdAt: Date,
  ): PaymentOrder {
    if (Number.isNaN(createdAt.getTime())) {
      throw new Error("Payment order creation date is invalid");
    }

    const dueAt = new Date(createdAt);
    dueAt.setHours(dueAt.getHours() + 48);

    return new PaymentOrder(
      id,
      winnerId,
      amount,
      new Date(createdAt),
      dueAt,
      PaymentOrderStatus.pending(),
    );
  }

  confirm(): void {
    if (!this.statusValue.equals(PaymentOrderStatus.pending())) {
      throw new Error("Only pending payment orders can be confirmed");
    }

    this.statusValue = PaymentOrderStatus.confirmed();
  }

  expire(currentDate: Date): void {
    if (Number.isNaN(currentDate.getTime())) {
      throw new Error("Payment order expiration check date is invalid");
    }

    if (!this.statusValue.equals(PaymentOrderStatus.pending())) {
      throw new Error("Only pending payment orders can expire");
    }

    if (currentDate.getTime() < this.dueAt.getTime()) {
      throw new Error("Payment order cannot expire before its due date");
    }

    this.statusValue = PaymentOrderStatus.expired();
  }

  get id(): PaymentOrderId {
    return this.orderId;
  }

  get winner(): UserId {
    return this.winnerId;
  }

  get amount(): Money {
    return this.orderAmount;
  }

  get createdDate(): Date {
    return new Date(this.createdAt);
  }

  get dueDate(): Date {
    return new Date(this.dueAt);
  }

  get status(): PaymentOrderStatus {
    return this.statusValue;
  }
}