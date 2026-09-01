export class RejectedBidAttemptId {
  private constructor(private readonly id: string) {}

  static create(id: string): RejectedBidAttemptId {
    const value = id.trim();

    if (value.length === 0) {
      throw new Error("Rejected bid attempt id cannot be empty");
    }

    return new RejectedBidAttemptId(value);
  }

  get value(): string {
    return this.id;
  }

  equals(other: RejectedBidAttemptId): boolean {
    return this.id === other.id;
  }
}