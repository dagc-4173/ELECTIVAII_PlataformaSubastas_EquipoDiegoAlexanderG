import { describe, expect, it, vi } from "vitest";
import { Auction } from "../../../src/domain/entities/Auction.js";
import { Bid } from "../../../src/domain/entities/Bid.js";
import { AuctionId } from "../../../src/domain/value-objects/AuctionId.js";
import { UserId } from "../../../src/domain/value-objects/UserId.js";
import { ItemId } from "../../../src/domain/value-objects/ItemId.js";
import { CategoryId } from "../../../src/domain/value-objects/CategoryId.js";
import { Money } from "../../../src/domain/value-objects/Money.js";
import { AuctionPublicationData } from "../../../src/domain/value-objects/AuctionPublicationData.js";
import { BidId } from "../../../src/domain/value-objects/BidId.js";
import { RejectedBidAttemptId } from "../../../src/domain/value-objects/RejectedBidAttemptId.js";
import { InMemoryAuctionRepository } from "../../../src/infrastructure/persistence/memory/InMemoryAuctionRepository.js";
import { PlaceBidUseCase } from "../../../src/application/use-cases/PlaceBidUseCase.js";
import { GetAuctionUseCase } from "../../../src/application/use-cases/GetAuctionUseCase.js";
import { CloseAuctionUseCase } from "../../../src/application/use-cases/CloseAuctionUseCase.js";
import type { AuctionEvent } from "../../../src/application/ports/AuctionEventPublisher.js";

async function fixture() {
  const repository = new InMemoryAuctionRepository();
  const auction = Auction.publish(AuctionId.create("auction"), UserId.create("seller"), ItemId.create("item"), CategoryId.create("category"),
    AuctionPublicationData.create(Money.create(100), Money.create(10), new Date("2026-01-01T00:00:00Z"), new Date("2026-01-02T00:00:00Z")));
  auction.placeBid(Bid.create(BidId.create("initial"), UserId.create("first"), Money.create(100), new Date("2026-01-01T01:00:00Z")), RejectedBidAttemptId.create("unused"));
  await repository.save(auction);
  const events: AuctionEvent[] = [];
  const publisher = { publish: (event: AuctionEvent) => { events.push(event); } };
  const ids = { generate: () => "payment-order" };
  const input = { auctionId: "auction", bidId: "new-bid", bidderId: "second", amount: 110,
    placedAt: new Date("2026-01-01T02:00:00Z"), currentDate: new Date("2026-01-01T02:00:00Z"), rejectedBidAttemptId: "rejected" };
  return { repository, publisher, events, ids, input };
}

describe("Auction output events", () => {
  it("announces accepted bid and previous leader only after persistence succeeds", async () => {
    const { repository, ids, input } = await fixture();
    const sequence: string[] = [];
    const save = repository.save.bind(repository);
    vi.spyOn(repository, "save").mockImplementation(async (auction) => { await save(auction); sequence.push("saved"); });
    const publisher = { publish: (event: AuctionEvent) => { sequence.push(event.type); } };
    await new PlaceBidUseCase(repository, ids, publisher).execute(input);
    expect(sequence).toEqual(["saved", "BID_ACCEPTED", "BID_OUTBID"]);
  });

  it("announces nothing when the repository refuses the write", async () => {
    const { repository, publisher, events, ids, input } = await fixture();
    vi.spyOn(repository, "save").mockRejectedValue(new Error("Save failed"));
    await expect(new PlaceBidUseCase(repository, ids, publisher).execute(input)).rejects.toThrow("Save failed");
    expect(events).toEqual([]);
  });

  it("does not turn a committed bid into a failure if event delivery throws", async () => {
    const { repository, ids, input } = await fixture();
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const publisher = { publish: () => { throw new Error("Delivery unavailable"); } };
      const result = await new PlaceBidUseCase(repository, ids, publisher).execute(input);
      expect(result.bidHistory.at(-1)?.id.value).toBe("new-bid");
      expect(log).toHaveBeenCalledTimes(2);
    } finally { log.mockRestore(); }
  });

  it("announces explicit close and does not announce a repeated failed close", async () => {
    const { repository, publisher, events } = await fixture();
    const close = new CloseAuctionUseCase(repository, publisher);
    const input = { auctionId: "auction", closedAt: new Date("2026-01-02T00:00:00Z"), paymentOrderId: "payment-order" };
    await close.execute(input);
    await expect(close.execute(input)).rejects.toThrow();
    expect(events).toEqual([{ type: "AUCTION_CLOSED", auctionId: "auction", status: "CLOSED", sellerId: "seller", winnerId: "first", amount: 100 }]);
  });

  it("does not announce lazy close when persistence fails", async () => {
    const { repository, publisher, events, ids } = await fixture();
    vi.spyOn(repository, "save").mockRejectedValue(new Error("Save failed"));
    await expect(new GetAuctionUseCase(repository, ids, publisher).execute({ auctionId: "auction", currentDate: new Date("2026-01-02T00:00:00Z") })).rejects.toThrow("Save failed");
    expect(events).toEqual([]);
  });
});
