import { createHmac, timingSafeEqual } from "node:crypto";
import { raw, Router } from "express";
import type { ProcessPaymentEventUseCase } from "../../../application/use-cases/ProcessPaymentEventUseCase.js";
import { PaymentEvent } from "../../../domain/entities/PaymentEvent.js";
import { PaymentEventId } from "../../../domain/value-objects/PaymentEventId.js";
import { PaymentOrderId } from "../../../domain/value-objects/PaymentOrderId.js";
import { ApiError } from "../errors/ApiError.js";
import { requireJson, validateBody } from "../middlewares/validateRequest.js";

export function createPaymentWebhookRouter(processPayment: ProcessPaymentEventUseCase, secret?: string) {
  const router = Router();
  router.post("/webhook", requireJson, raw({ type: "application/json", limit: "16kb", inflate: false }),
    (request, _response, next) => {
      if (!secret || secret.length < 32) {
        throw new ApiError(503, "WEBHOOK_UNAVAILABLE", "Payment webhook is unavailable");
      }
      const signature = request.get("X-Payment-Signature") ?? "";
      if (!Buffer.isBuffer(request.body) || !/^[a-f0-9]{64}$/i.test(signature)) {
        throw new ApiError(401, "INVALID_PAYMENT_SIGNATURE", "Invalid payment webhook signature");
      }
      const expected = createHmac("sha256", secret).update(request.body).digest();
      if (!timingSafeEqual(expected, Buffer.from(signature, "hex"))) {
        throw new ApiError(401, "INVALID_PAYMENT_SIGNATURE", "Invalid payment webhook signature");
      }
      try {
        request.body = JSON.parse(request.body.toString("utf8"));
      } catch {
        throw new ApiError(400, "INVALID_JSON", "Malformed JSON body");
      }
      next();
    },
    validateBody({ eventId: "string", paymentOrderId: "string", result: "string", occurredAt: "date" }),
    (request, response) => {
      const { eventId, paymentOrderId, result, occurredAt } = request.body;
      if (result !== "SUCCESS" && result !== "FAILED") {
        throw new ApiError(400, "INVALID_PAYMENT_RESULT", "Unknown payment event result");
      }
      const event = PaymentEvent.create(
        PaymentEventId.create(eventId),
        PaymentOrderId.create(paymentOrderId),
        result,
        new Date(occurredAt),
      );
      const outcome = processPayment.execute(event);
      if (outcome === "ORDER_NOT_FOUND") {
        throw new ApiError(404, "PAYMENT_ORDER_NOT_FOUND", "Payment order not found");
      }
      response.status(200).json({ eventId: event.id.value, outcome });
    });
  return router;
}
