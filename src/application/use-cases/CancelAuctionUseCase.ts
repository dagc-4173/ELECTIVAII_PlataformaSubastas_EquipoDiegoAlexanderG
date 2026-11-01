
import type { AuctionRepository } from "../../domain/ports/AuctionRepository.js";
import { Auction } from "../../domain/entities/Auction.js";
import { AuctionId } from "../../domain/value-objects/AuctionId.js";
import { UserId } from "../../domain/value-objects/UserId.js";
import { NotFoundError } from "../errors/NotFoundError.js";

export class CancelAuctionUseCase {
  constructor(
    private readonly auctionRepository: AuctionRepository,
  ) {}

  async execute(
    auctionId: string,
    requesterId: string,
  ): Promise<Auction> {
    const auction = await this.auctionRepository.findById(
      AuctionId.create(auctionId),
    );

    if (auction === null) {
      throw new NotFoundError("Auction not found");
    }

    auction.cancel(UserId.create(requesterId));

    await this.auctionRepository.save(auction);

    return auction;
  }
}
