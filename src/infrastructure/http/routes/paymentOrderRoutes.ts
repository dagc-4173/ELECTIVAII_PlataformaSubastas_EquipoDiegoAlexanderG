import { Router } from "express";
import type { RequestHandler } from "express";
import type { PaymentOrderController } from "../controllers/PaymentOrderController.js";

export function createPaymentOrderRouter(
  controller: PaymentOrderController,
  authenticate: RequestHandler,
): Router {
  const router = Router();
  router.get("/:auctionId/payment-order", authenticate, controller.get);
  return router;
}
