export class AuctionId {
  private constructor(private readonly id: string) {}

  static create(id: string): AuctionId {
    const value = id.trim();

    if (value.length === 0) {
      throw new Error("Auction id cannot be empty");
    }

    return new AuctionId(value);
  }

  get value(): string {
    return this.id;
  }

  equals(other: AuctionId): boolean {
    return this.id === other.id;
  }
}