import type { AuctionPhoto, AuctionRepository } from "../../domain/ports/AuctionRepository.js";
import { AuctionId } from "../../domain/value-objects/AuctionId.js";
import { CategoryId } from "../../domain/value-objects/CategoryId.js";
import { ItemId } from "../../domain/value-objects/ItemId.js";
import { UserId } from "../../domain/value-objects/UserId.js";
import { NotFoundError } from "../errors/NotFoundError.js";

interface EditAuctionInput {
  auctionId: string;
  sellerId: string;
  itemId: string;
  categoryId: string;
}

export class EditAuctionUseCase {
  constructor(private readonly auctions: AuctionRepository) {}

  async execute(input: EditAuctionInput, photo?: AuctionPhoto) {
    const auction = await this.auctions.findById(AuctionId.create(input.auctionId));
    if (!auction) throw new NotFoundError("Auction not found");

    auction.editPublication(
      UserId.create(input.sellerId),
      ItemId.create(input.itemId),
      CategoryId.create(input.categoryId),
      new Date(),
    );
    await this.auctions.save(auction, photo);
    return auction;
  }
}
