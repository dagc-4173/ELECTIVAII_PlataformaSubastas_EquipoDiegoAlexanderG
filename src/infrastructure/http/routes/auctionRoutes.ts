import { requireJson, validateAuctionParams, validateAuctionQuery, validateAuctionPublication, validateBid, validateBody } from "../middlewares/validateRequest.js";


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
  router.get("/", validateAuctionQuery, auctionController.list);

  // Detalle de una subasta
  router.get<AuctionParams>(
    "/:auctionId",
    authenticate,
    validateAuctionParams,
    auctionController.getById,
  );

  // Publicar una subasta
  router.post(
    "/",
    authenticate,
    requireJson,
    validateAuctionPublication,
    auctionController.publish,
  );

  // Registrar una puja
  router.post<AuctionParams>(
    "/:auctionId/bids",
    authenticate,
    validateAuctionParams,
    requireJson,
    validateBid,
    auctionController.placeBid,
  );

  router.patch<AuctionParams>(
    "/:auctionId",
    authenticate,
    validateAuctionParams,
    requireJson,
    validateBody({ itemId: "string", categoryId: "string" }),
    auctionController.edit,
  );

  // Cancelar una subasta
  router.delete<AuctionParams>(
    "/:auctionId",
    authenticate,
    validateAuctionParams,
    auctionController.cancel,
  );

  return router;
}
