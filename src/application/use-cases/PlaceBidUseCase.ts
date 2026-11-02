import { discardAuctionEvents } from "../ports/AuctionEventPublisher.js";
import type { AuctionEventPublisher } from "../ports/AuctionEventPublisher.js";
import { announceAuctionClosed, announceAuctionEvent } from "../events/announceAuctionEvent.js";
import type { AuctionRepository } from "../../domain/ports/AuctionRepository.js";
import { Auction } from "../../domain/entities/Auction.js";
import { Bid } from "../../domain/entities/Bid.js";
import { AuctionId } from "../../domain/value-objects/AuctionId.js";
import { AuctionStatus } from "../../domain/value-objects/AuctionStatus.js";
import { BidId } from "../../domain/value-objects/BidId.js";
import { Money } from "../../domain/value-objects/Money.js";
import { PaymentOrderId } from "../../domain/value-objects/PaymentOrderId.js";
import { RejectedBidAttemptId } from "../../domain/value-objects/RejectedBidAttemptId.js";
import { UserId } from "../../domain/value-objects/UserId.js";
import { NotFoundError } from "../errors/NotFoundError.js";
import type { IdGenerator } from "../ports/IdGenerator.js";

export interface PlaceBidInput {
  auctionId: string;
  bidId: string;
  bidderId: string;
  amount: number;
  placedAt: Date;
  rejectedBidAttemptId: string;
  currentDate: Date;
}

export class PlaceBidUseCase {
  constructor(
    private readonly auctionRepository: AuctionRepository,
    private readonly idGenerator: IdGenerator,
    private readonly events: AuctionEventPublisher = discardAuctionEvents,
  ) {}

  async execute(input: PlaceBidInput): Promise<Auction> {
    const auction = await this.auctionRepository.findById(
      AuctionId.create(input.auctionId),
    );

    if (auction === null) {
      throw new NotFoundError("Auction not found");
    }

    const hasExpired =
      input.currentDate.getTime() >= auction.publication.closesAt.getTime();

    const isOpen = auction.status.equals(AuctionStatus.open());

    if (hasExpired && isOpen) {
      const paymentOrderId =
        auction.bidHistory.length === 0
          ? undefined
          : PaymentOrderId.create(this.idGenerator.generate());

      auction.close(input.currentDate, paymentOrderId);

      await this.auctionRepository.save(auction);
      announceAuctionClosed(this.events, auction);
    }

    const bid = Bid.create(
      BidId.create(input.bidId),
      UserId.create(input.bidderId),
      Money.create(input.amount),
      input.placedAt,
    );

    const previousBidder = auction.bidHistory.at(-1)?.bidder.value;

    try {
      auction.placeBid(
        bid,
        RejectedBidAttemptId.create(input.rejectedBidAttemptId),
      );
    } catch (error: unknown) {
      await this.auctionRepository.save(auction);

      throw error;
    }

    await this.auctionRepository.save(auction);
    announceAuctionEvent(this.events, {
      type: "BID_ACCEPTED", auctionId: auction.id.value, bidId: bid.id.value,
      bidderId: bid.bidder.value, amount: bid.amount.value, placedAt: bid.date.toISOString(),
    });
    if (previousBidder !== undefined) {
      announceAuctionEvent(this.events, {
        type: "BID_OUTBID", auctionId: auction.id.value, recipientId: previousBidder,
        currentBidderId: bid.bidder.value, amount: bid.amount.value,
      });
    }

    return auction;
  }
}