import { Auction } from "../../domain/entities/Auction.js";
import type { AuctionRepository } from "../../domain/ports/AuctionRepository.js";
import { AuctionId } from "../../domain/value-objects/AuctionId.js";
import { AuctionPublicationData } from "../../domain/value-objects/AuctionPublicationData.js";
import { CategoryId } from "../../domain/value-objects/CategoryId.js";
import { ItemId } from "../../domain/value-objects/ItemId.js";
import { Money } from "../../domain/value-objects/Money.js";
import { UserId } from "../../domain/value-objects/UserId.js";

export interface PublishAuctionInput {
  auctionId: string;
  sellerId: string;
  itemId: string;
  categoryId: string;
  basePrice: number;
  minimumIncrement: number;
  publishedAt: Date;
  closesAt: Date;
}

export class PublishAuctionUseCase {
  constructor(private readonly auctionRepository: AuctionRepository) {}

  async execute(input: PublishAuctionInput): Promise<Auction> {
    const publicationData = AuctionPublicationData.create(
      Money.create(input.basePrice),
      Money.create(input.minimumIncrement),
      input.publishedAt,
      input.closesAt,
    );

    const auction = Auction.publish(
      AuctionId.create(input.auctionId),
      UserId.create(input.sellerId),
      ItemId.create(input.itemId),
      CategoryId.create(input.categoryId),
      publicationData,
    );

    await this.auctionRepository.save(auction);

    return auction;
  }
}