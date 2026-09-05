import express from "express";

import { PublishAuctionUseCase } from "../application/use-cases/PublishAuctionUseCase.js";
import { GetAuctionUseCase } from "../application/use-cases/GetAuctionUseCase.js";
import { ListAuctionsUseCase } from "../application/use-cases/ListAuctionsUseCase.js";
import { CancelAuctionUseCase } from "../application/use-cases/CancelAuctionUseCase.js";
import { PlaceBidUseCase } from "../application/use-cases/PlaceBidUseCase.js";

import { InMemoryAuctionRepository } from "./persistence/memory/InMemoryAuctionRepository.js";
import { AuctionController } from "./http/controllers/AuctionController.js";
import { createAuctionRouter } from "./http/routes/auctionRoutes.js";
import { errorHandler } from "./http/middlewares/errorHandler.js";

const app = express();

app.use(express.json());

const auctionRepository = new InMemoryAuctionRepository();

const publishAuctionUseCase = new PublishAuctionUseCase(
  auctionRepository,
);

const getAuctionUseCase = new GetAuctionUseCase(
  auctionRepository,
);

const listAuctionsUseCase = new ListAuctionsUseCase(
  auctionRepository,
);

const cancelAuctionUseCase = new CancelAuctionUseCase(
  auctionRepository,
);

const placeBidUseCase = new PlaceBidUseCase(
  auctionRepository,
);

const auctionController = new AuctionController(
  publishAuctionUseCase,
  getAuctionUseCase,
  listAuctionsUseCase,
  cancelAuctionUseCase,
  placeBidUseCase,
);

app.use(
  "/auctions",
  createAuctionRouter(auctionController),
);

app.use(errorHandler);

export { app };