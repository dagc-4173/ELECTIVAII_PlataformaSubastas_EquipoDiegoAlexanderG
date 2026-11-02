import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { Auction } from "../../../src/domain/entities/Auction.js";
import { AuctionId } from "../../../src/domain/value-objects/AuctionId.js";
import { AuctionPublicationData } from "../../../src/domain/value-objects/AuctionPublicationData.js";
import { CategoryId } from "../../../src/domain/value-objects/CategoryId.js";
import { ItemId } from "../../../src/domain/value-objects/ItemId.js";
import { Money } from "../../../src/domain/value-objects/Money.js";
import { UserId } from "../../../src/domain/value-objects/UserId.js";

import { CancelAuctionUseCase } from "../../../src/application/use-cases/CancelAuctionUseCase.js";
import { GetAuctionUseCase } from "../../../src/application/use-cases/GetAuctionUseCase.js";
import { ListAuctionsUseCase } from "../../../src/application/use-cases/ListAuctionsUseCase.js";
import { PlaceBidUseCase } from "../../../src/application/use-cases/PlaceBidUseCase.js";
import { PublishAuctionUseCase } from "../../../src/application/use-cases/PublishAuctionUseCase.js";

import { AuctionController } from "../../../src/infrastructure/http/controllers/AuctionController.js";
import { createAuctionRouter } from "../../../src/infrastructure/http/routes/auctionRoutes.js";
import { createAuthenticate } from "../../../src/infrastructure/http/middlewares/authenticate.js";
import { errorHandler } from "../../../src/infrastructure/http/middlewares/errorHandler.js";
import { RandomIdGenerator } from "../../../src/infrastructure/id/RandomIdGenerator.js";
import { InMemoryAuctionRepository } from "../../../src/infrastructure/persistence/memory/InMemoryAuctionRepository.js";
import { JwtTokenService } from "../../../src/infrastructure/security/JwtTokenService.js";

import { User } from "../../../src/domain/entities/User.js";
import { Email } from "../../../src/domain/value-objects/Email.js";
import { InMemoryUserRepository } from "../../../src/infrastructure/persistence/memory/InMemoryUserRepository.js";

async function createFixture() {
  const repository = new InMemoryAuctionRepository();
  const idGenerator = new RandomIdGenerator();
  const publishedAt = new Date(Date.now() - 60_000);
  const closesAt = new Date(publishedAt.getTime() + 24 * 60 * 60 * 1000,);

  const userRepository = new InMemoryUserRepository();

  for (const userId of [
    "seller-001",
    "seller-002",
    "bidder-001",
    "user-002",
  ]) {
    await userRepository.save(
      User.create(
        UserId.create(userId),
        `Test ${userId}`,
        Email.create(`${userId}@example.com`),
        "test-password-hash",
      ),
    );
  }

  await repository.save(
    Auction.publish(
      AuctionId.create("auction-001"),
      UserId.create("seller-001"),
      ItemId.create("item-001"),
      CategoryId.create("category-001"),
      AuctionPublicationData.create(
        Money.create(100000),
        Money.create(5000),
        publishedAt,
        closesAt,
      ),
    ),
  );

  const controller = new AuctionController(
    new PublishAuctionUseCase(repository),
    new GetAuctionUseCase(repository, idGenerator),
    new ListAuctionsUseCase(repository),
    new CancelAuctionUseCase(repository),
    new PlaceBidUseCase(repository, idGenerator),
  );

  const tokenService = new JwtTokenService(
    "integration-test-secret-0123456789-abcdef",
  );

  const app = express();
  app.use(express.json());

  app.use(
    "/auctions",
    createAuctionRouter(controller, createAuthenticate(tokenService, userRepository),),
  );

  app.use(errorHandler);

  return { app, repository, tokenService, userRepository };
}

describe("RF-07 - HTTP auction cancellation authorization", () => {
  it("should return 401 without a JWT", async () => {
    const { app } = await createFixture();

    const response = await request(app).delete("/auctions/auction-001");

    expect(response.status).toBe(401);
  });

  it("should return 401 with an invalid JWT", async () => {
    const { app } = await createFixture();

    const response = await request(app)
      .delete("/auctions/auction-001")
      .set("Authorization", "Bearer invalid.token.value");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_TOKEN");
  });


  it("RF-04 should use the authenticated seller instead of the request body identity", async () => {
    const { app, repository, tokenService } =
      await createFixture();

    const token = tokenService.generate("seller-002");

    const publishedAt = new Date();
    const closesAt = new Date(
      publishedAt.getTime() + 24 * 60 * 60 * 1000,
    );

    const response = await request(app)
      .post("/auctions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        auctionId: "auction-002",
        sellerId: "seller-001",
        itemId: "item-002",
        categoryId: "category-001",
        basePrice: 100000,
        minimumIncrement: 5000,
        publishedAt: publishedAt.toISOString(),
        closesAt: closesAt.toISOString(),
      });

    expect(response.status).toBe(201);

    const auction = await repository.findById(
      AuctionId.create("auction-002"),
    );

    expect(auction?.seller.value).toBe("seller-002");
  });

  it("RN-04 should reject seller cancellation after a bid", async () => {
    const { app, repository, tokenService } =
      await createFixture();

    const bidderToken = tokenService.generate("bidder-001");
    const sellerToken = tokenService.generate("seller-001");

    const bidResponse = await request(app)
      .post("/auctions/auction-001/bids")
      .set("Authorization", `Bearer ${bidderToken}`)
      .send({
        bidId: "bid-001",
        amount: 100000,
        rejectedBidAttemptId: "rejected-001",
      });

    expect(bidResponse.status).toBe(201);

    const cancelResponse = await request(app)
      .delete("/auctions/auction-001")
      .set("Authorization", `Bearer ${sellerToken}`);

    expect(cancelResponse.status).toBe(400);
    expect(cancelResponse.body.error.code).toBe(
      "BUSINESS_RULE_VIOLATION",
    );
    expect(cancelResponse.body.error.message).toBe(
      "Auction with bids cannot be cancelled",
    );

    const auction = await repository.findById(
      AuctionId.create("auction-001"),
    );

    expect(auction?.status.value).toBe("OPEN");
    expect(auction?.bidHistory).toHaveLength(1);
  });

  it("RN-07 should reject a bid from the auction seller", async () => {
    const { app, repository, tokenService } =
      await createFixture();

    const token = tokenService.generate("seller-001");

    const response = await request(app)
      .post("/auctions/auction-001/bids")
      .set("Authorization", `Bearer ${token}`)
      .send({
        bidId: "bid-seller-001",
        amount: 100000,
        rejectedBidAttemptId: "rejected-seller-001",
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe(
      "BUSINESS_RULE_VIOLATION",
    );

    const auction = await repository.findById(
      AuctionId.create("auction-001"),
    );

    expect(auction?.bidHistory).toHaveLength(0);
    expect(auction?.rejectedBidHistory).toHaveLength(1);
    expect(auction?.rejectedBidHistory[0]?.reason).toBe(
      "Seller cannot bid on own auction",
    );
  });

  it("RF-09 should use the authenticated bidder instead of the request body identity", async () => {
    const { app, repository, tokenService } =
      await createFixture();

    const token = tokenService.generate("bidder-001");

    const response = await request(app)
      .post("/auctions/auction-001/bids")
      .set("Authorization", `Bearer ${token}`)
      .send({
        bidId: "bid-001",
        bidderId: "seller-001",
        amount: 100000,
        rejectedBidAttemptId: "rejected-001",
      });

    expect(response.status).toBe(201);

    const auction = await repository.findById(
      AuctionId.create("auction-001"),
    );

    expect(auction?.bidHistory).toHaveLength(1);
    expect(auction?.bidHistory[0]?.bidder.value).toBe(
      "bidder-001",
    );
  });

  it("should return 404 when the auction does not exist", async () => {
    const { app, tokenService } = await createFixture();

    const token = tokenService.generate("seller-001");

    const response = await request(app)
      .delete("/auctions/auction-not-found")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("RESOURCE_NOT_FOUND");
  });

  it("should return 403 when another user tries to cancel", async () => {
    const { app, repository, tokenService } = await createFixture();

    const token = tokenService.generate("user-002");

    const response = await request(app)
      .delete("/auctions/auction-001")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN_OPERATION");

    const auction = await repository.findById(AuctionId.create("auction-001"));

    expect(auction?.status.value).toBe("OPEN");
  });

  it("should allow the seller to cancel an auction without bids", async () => {
    const { app, repository, tokenService } = await createFixture();

    const token = tokenService.generate("seller-001");

    const response = await request(app)
      .delete("/auctions/auction-001")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);

    const auction = await repository.findById(AuctionId.create("auction-001"));

    expect(auction?.status.value).toBe("CANCELLED");
  });
});
