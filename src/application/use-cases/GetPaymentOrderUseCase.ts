import type { AuctionRepository } from "../../domain/ports/AuctionRepository.js";
import { AuctionId } from "../../domain/value-objects/AuctionId.js";
import { UserId } from "../../domain/value-objects/UserId.js";
import { ForbiddenOperationError } from "../../domain/errors/ForbiddenOperationError.js";
import { NotFoundError } from "../errors/NotFoundError.js";

export class GetPaymentOrderUseCase {
  constructor(private readonly auctionRepository: AuctionRepository) {}

  async execute(auctionId: string, authenticatedUserId: string) {
    const auction = await this.auctionRepository.findById(AuctionId.create(auctionId));
    if (auction === null) throw new NotFoundError("Auction not found");
    const order = auction.paymentOrder;
    if (order === undefined) throw new NotFoundError("Payment order not found");
    if (!order.winner.equals(UserId.create(authenticatedUserId))) {
      throw new ForbiddenOperationError("Only the auction winner can view the payment order");
    }
    return order;
  }
}
