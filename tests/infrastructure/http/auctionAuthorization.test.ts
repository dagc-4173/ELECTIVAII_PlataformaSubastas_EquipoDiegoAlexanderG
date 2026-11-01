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

async function createFixture() {
  const repository = new InMemoryAuctionRepository();
  const idGenerator = new RandomIdGenerator();

  await repository.save(
    Auction.publish(
      AuctionId.create("auction-001"),
      UserId.create("seller-001"),
      ItemId.create("item-001"),
      CategoryId.create("category-001"),
      AuctionPublicationData.create(
        Money.create(100000),
        Money.create(5000),
        new Date("2026-11-02T18:00:00.000Z"),
        new Date("2026-11-03T18:00:00.000Z"),
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
    createAuctionRouter(controller, createAuthenticate(tokenService)),
  );

  app.use(errorHandler);

  return { app, repository, tokenService };
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
