import { Money } from "../value-objects/Money.js";
import { PaymentOrderId } from "../value-objects/PaymentOrderId.js";
import { UserId } from "../value-objects/UserId.js";

export class PaymentOrder {
  private constructor(
    private readonly orderId: PaymentOrderId,
    private readonly winnerId: UserId,
    private readonly orderAmount: Money,
    private readonly createdAt: Date,
    private readonly dueAt: Date,
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
    );
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
}