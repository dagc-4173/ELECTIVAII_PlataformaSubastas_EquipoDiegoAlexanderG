import { Router } from "express";

import type { AuctionController } from "../controllers/AuctionController.js";

export function createAuctionRouter(
  auctionController: AuctionController,
): Router {
  const router = Router();

  router.post("/", auctionController.publish);
  router.get("/", auctionController.list);
  router.get("/:auctionId", auctionController.getById);
  router.post("/:auctionId/bids", auctionController.placeBid);
  router.delete("/:auctionId", auctionController.cancel);

  return router;
}