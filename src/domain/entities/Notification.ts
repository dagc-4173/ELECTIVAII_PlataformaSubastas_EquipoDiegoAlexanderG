import { NotificationId } from "../value-objects/NotificationId.js";
import { UserId } from "../value-objects/UserId.js";

export class Notification {
  private constructor(
    private readonly notificationId: NotificationId,
    private readonly recipientId: UserId,
    private readonly notificationMessage: string,
    private readonly createdAt: Date,
  ) {}

  static create(
    id: NotificationId,
    recipientId: UserId,
    message: string,
    createdAt: Date,
  ): Notification {
    const normalizedMessage = message.trim();

    if (normalizedMessage.length === 0) {
      throw new Error("Notification message cannot be empty");
    }

    if (Number.isNaN(createdAt.getTime())) {
      throw new Error("Notification creation date is invalid");
    }

    return new Notification(
      id,
      recipientId,
      normalizedMessage,
      new Date(createdAt),
    );
  }

  get id(): NotificationId {
    return this.notificationId;
  }

  get recipient(): UserId {
    return this.recipientId;
  }

  get message(): string {
    return this.notificationMessage;
  }

  get date(): Date {
    return new Date(this.createdAt);
  }
}