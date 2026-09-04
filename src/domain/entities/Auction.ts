import { AuctionId } from "../value-objects/AuctionId.js";
import { AuctionPublicationData } from "../value-objects/AuctionPublicationData.js";
import { AuctionStatus } from "../value-objects/AuctionStatus.js";
import { CategoryId } from "../value-objects/CategoryId.js";
import { ItemId } from "../value-objects/ItemId.js";
import { UserId } from "../value-objects/UserId.js";
import { Bid } from "./Bid.js";

export class Auction {
  private constructor(
    private readonly auctionId: AuctionId,
    private readonly sellerId: UserId,
    private readonly itemId: ItemId,
    private readonly categoryId: CategoryId,
    private readonly publicationData: AuctionPublicationData,
    private statusValue: AuctionStatus,
    private readonly bids: Bid[],
  ) {}

  static publish(
    id: AuctionId,
    sellerId: UserId,
    itemId: ItemId,
    categoryId: CategoryId,
    publicationData: AuctionPublicationData,
  ): Auction {
    return new Auction(
      id,
      sellerId,
      itemId,
      categoryId,
      publicationData,
      AuctionStatus.open(),
      [],
    );
  }

  cancel(): void {
    if (this.bids.length > 0) {
        throw new Error("Auction with bids cannot be cancelled");
    }

    this.statusValue = AuctionStatus.cancelled();
    }

  get id(): AuctionId {
    return this.auctionId;
  }

  get seller(): UserId {
    return this.sellerId;
  }

  get item(): ItemId {
    return this.itemId;
  }

  get category(): CategoryId {
    return this.categoryId;
  }

  get publication(): AuctionPublicationData {
    return this.publicationData;
  }

  get status(): AuctionStatus {
    return this.statusValue;
  }
  get bidHistory(): readonly Bid[] {
    return [...this.bids];
  }
}