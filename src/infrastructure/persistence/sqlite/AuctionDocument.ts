import { Auction } from "../../../domain/entities/Auction.js";
import { Bid } from "../../../domain/entities/Bid.js";
import { RejectedBidAttempt } from "../../../domain/entities/RejectedBidAttempt.js";
import { PaymentOrder } from "../../../domain/entities/PaymentOrder.js";
import { AuctionId } from "../../../domain/value-objects/AuctionId.js";
import { AuctionPublicationData } from "../../../domain/value-objects/AuctionPublicationData.js";
import { AuctionStatus } from "../../../domain/value-objects/AuctionStatus.js";
import { UserId } from "../../../domain/value-objects/UserId.js";
import { ItemId } from "../../../domain/value-objects/ItemId.js";
import { CategoryId } from "../../../domain/value-objects/CategoryId.js";
import { Money } from "../../../domain/value-objects/Money.js";
import { BidId } from "../../../domain/value-objects/BidId.js";
import { RejectedBidAttemptId } from "../../../domain/value-objects/RejectedBidAttemptId.js";
import { PaymentOrderId } from "../../../domain/value-objects/PaymentOrderId.js";

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Invalid auction document");
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== "string") throw new Error("Invalid auction document string");
  return value;
}
function amount(value: unknown): Money {
  if (typeof value !== "number") throw new Error("Invalid auction document amount");
  return Money.create(value);
}
function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error("Invalid auction document history");
  return value;
}

export function serializeAuction(auction: Auction): string {
  const order = auction.paymentOrder;
  return JSON.stringify({
    version: 1, id: auction.id.value, sellerId: auction.seller.value,
    itemId: auction.item.value, categoryId: auction.category.value,
    basePrice: auction.publication.basePrice.value, minimumIncrement: auction.publication.minimumIncrement.value,
    publishedAt: auction.publication.publishedAt.toISOString(), closesAt: auction.publication.closesAt.toISOString(),
    status: auction.status.value,
    bids: auction.bidHistory.map((bid) => ({ id: bid.id.value, bidderId: bid.bidder.value, amount: bid.amount.value, placedAt: bid.date.toISOString() })),
    rejectedAttempts: auction.rejectedBidHistory.map((attempt) => ({ id: attempt.id.value, bidderId: attempt.bidder.value,
      amount: attempt.amount.value, reason: attempt.reason, attemptedAt: attempt.date.toISOString() })),
    paymentOrder: order === undefined ? null : { id: order.id.value, winnerId: order.winner.value, amount: order.amount.value,
      createdAt: order.createdDate.toISOString(), dueAt: order.dueDate.toISOString(), status: order.status.value },
  });
}

export function deserializeAuction(document: string): Auction {
  const stored: unknown = JSON.parse(document);
  const data = record(stored);
  if (data.version !== 1) throw new Error("Unsupported auction document version");
  const statuses = { OPEN: AuctionStatus.open, CLOSED: AuctionStatus.closed, CANCELLED: AuctionStatus.cancelled,
    DESERTED: AuctionStatus.deserted, DEFAULTED: AuctionStatus.defaulted };
  const status = text(data.status);
  if (!Object.hasOwn(statuses, status)) throw new Error("Invalid stored auction status");
  let paymentOrder: PaymentOrder | undefined;
  if (data.paymentOrder !== null) {
    const order = record(data.paymentOrder);
    paymentOrder = PaymentOrder.create(PaymentOrderId.create(text(order.id)), UserId.create(text(order.winnerId)),
      amount(order.amount), new Date(text(order.createdAt)));
    if (paymentOrder.dueDate.toISOString() !== text(order.dueAt)) throw new Error("Invalid stored payment deadline");
    if (order.status === "CONFIRMED") paymentOrder.confirm();
    else if (order.status === "EXPIRED") paymentOrder.expire(paymentOrder.dueDate);
    else if (order.status !== "PENDING") throw new Error("Invalid stored payment status");
  }
  return Auction.reconstitute({
    id: AuctionId.create(text(data.id)), sellerId: UserId.create(text(data.sellerId)),
    itemId: ItemId.create(text(data.itemId)), categoryId: CategoryId.create(text(data.categoryId)),
    publication: AuctionPublicationData.create(amount(data.basePrice), amount(data.minimumIncrement),
      new Date(text(data.publishedAt)), new Date(text(data.closesAt))),
    status: statuses[status as keyof typeof statuses](),
    bids: array(data.bids).map((value) => {
      const bid = record(value);
      return Bid.create(BidId.create(text(bid.id)), UserId.create(text(bid.bidderId)), amount(bid.amount), new Date(text(bid.placedAt)));
    }),
    rejectedAttempts: array(data.rejectedAttempts).map((value) => {
      const attempt = record(value);
      return RejectedBidAttempt.create(RejectedBidAttemptId.create(text(attempt.id)), UserId.create(text(attempt.bidderId)),
        amount(attempt.amount), text(attempt.reason), new Date(text(attempt.attemptedAt)));
    }),
    paymentOrder,
  });
}
