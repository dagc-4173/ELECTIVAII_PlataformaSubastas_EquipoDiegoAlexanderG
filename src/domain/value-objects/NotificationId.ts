export class NotificationId {
  private constructor(private readonly id: string) {}

  static create(id: string): NotificationId {
    const value = id.trim();

    if (value.length === 0) {
      throw new Error("Notification id cannot be empty");
    }

    return new NotificationId(value);
  }

  get value(): string {
    return this.id;
  }

  equals(other: NotificationId): boolean {
    return this.id === other.id;
  }
}