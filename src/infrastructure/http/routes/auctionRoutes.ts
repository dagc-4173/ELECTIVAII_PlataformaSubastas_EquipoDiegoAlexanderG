

import { Router } from "express";
import type { RequestHandler } from "express";

import type { AuctionController } from "../controllers/AuctionController.js";

type AuctionParams = {
  auctionId: string;
};

export function createAuctionRouter(
  auctionController: AuctionController,
  authenticate: RequestHandler,
): Router {
  const router = Router();

  // Listado de subastas
  router.get("/", auctionController.list);

  // Detalle de una subasta
  router.get<AuctionParams>(
    "/:auctionId",
    authenticate,
    auctionController.getById,
  );

  // Publicar una subasta
  router.post(
    "/",
    authenticate,
    auctionController.publish,
  );

  // Registrar una puja
  router.post<AuctionParams>(
    "/:auctionId/bids",
    authenticate,
    auctionController.placeBid,
  );

  // Cancelar una subasta
  router.delete<AuctionParams>(
    "/:auctionId",
    authenticate,
    auctionController.cancel,
  );

  return router;
}
