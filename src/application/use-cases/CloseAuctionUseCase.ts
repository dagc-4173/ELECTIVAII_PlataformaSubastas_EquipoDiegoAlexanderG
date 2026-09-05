import type { AuctionRepository } from "../../domain/ports/AuctionRepository.js";
import { Auction } from "../../domain/entities/Auction.js";
import { AuctionId } from "../../domain/value-objects/AuctionId.js";
import { PaymentOrderId } from "../../domain/value-objects/PaymentOrderId.js";
import { NotFoundError } from "../errors/NotFoundError.js";

export interface CloseAuctionInput {
  auctionId: string;
  closedAt: Date;
  paymentOrderId?: string;
}

export class CloseAuctionUseCase {
  constructor(private readonly auctionRepository: AuctionRepository) {}

  async execute(input: CloseAuctionInput): Promise<Auction> {
    const auction = await this.auctionRepository.findById(
      AuctionId.create(input.auctionId),
    );

    if (auction === null) {
      throw new NotFoundError("Auction not found");
    }

    const paymentOrderId =
      input.paymentOrderId === undefined
        ? undefined
        : PaymentOrderId.create(input.paymentOrderId);

    auction.close(input.closedAt, paymentOrderId);

    await this.auctionRepository.save(auction);

    return auction;
  }
}