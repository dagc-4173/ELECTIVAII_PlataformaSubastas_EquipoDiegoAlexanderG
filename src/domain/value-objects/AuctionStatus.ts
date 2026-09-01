export type AuctionStatusValue =
  | "OPEN"
  | "CLOSED"
  | "CANCELLED"
  | "DESERTED"
  | "DEFAULTED";

export class AuctionStatus {
  private constructor(private readonly status: AuctionStatusValue) {}

  static open(): AuctionStatus {
    return new AuctionStatus("OPEN");
  }

  static closed(): AuctionStatus {
    return new AuctionStatus("CLOSED");
  }

  static cancelled(): AuctionStatus {
    return new AuctionStatus("CANCELLED");
  }

  static deserted(): AuctionStatus {
    return new AuctionStatus("DESERTED");
  }

  static defaulted(): AuctionStatus {
    return new AuctionStatus("DEFAULTED");
  }

  get value(): AuctionStatusValue {
    return this.status;
  }

  equals(other: AuctionStatus): boolean {
    return this.status === other.status;
  }
}