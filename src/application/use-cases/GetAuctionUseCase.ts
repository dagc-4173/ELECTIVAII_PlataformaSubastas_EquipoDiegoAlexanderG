import type { AuctionRepository } from "../../domain/ports/AuctionRepository.js";
import { Auction } from "../../domain/entities/Auction.js";
import { AuctionId } from "../../domain/value-objects/AuctionId.js";
import { AuctionStatus } from "../../domain/value-objects/AuctionStatus.js";
import { PaymentOrderId } from "../../domain/value-objects/PaymentOrderId.js";

export interface GetAuctionInput {
  auctionId: string;
  currentDate: Date;
  paymentOrderId?: string;
}

export class GetAuctionUseCase {
  constructor(private readonly auctionRepository: AuctionRepository) {}

  async execute(input: GetAuctionInput): Promise<Auction | null> {
    const auction = await this.auctionRepository.findById(
      AuctionId.create(input.auctionId),
    );

    if (auction === null) {
      return null;
    }

    const hasExpired =
      input.currentDate.getTime() >=
      auction.publication.closesAt.getTime();

    const isOpen = auction.status.equals(AuctionStatus.open());

    if (hasExpired && isOpen) {
      const paymentOrderId =
        input.paymentOrderId === undefined
          ? undefined
          : PaymentOrderId.create(input.paymentOrderId);

      auction.close(input.currentDate, paymentOrderId);

      await this.auctionRepository.save(auction);
    }

    return auction;
  }
}