import { createHmac, randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import type { GetPaymentOrderUseCase } from "../../../application/use-cases/GetPaymentOrderUseCase.js";
import { ApiError } from "../errors/ApiError.js";

export class PaymentOrderController {
  constructor(
    private readonly getPaymentOrderUseCase: GetPaymentOrderUseCase,
    private readonly simulationSecret?: string,
  ) {}

  get = async (request: Request<{ auctionId: string }>, response: Response): Promise<void> => {
    const order = await this.getOrder(request, response);
    response.status(200).json({
      id: order.id.value,
      auctionId: request.params.auctionId,
      winnerId: order.winner.value,
      amount: order.amount.value,
      status: order.status.value,
      createdAt: order.createdDate.toISOString(),
      dueAt: order.dueDate.toISOString(),
      ...(this.simulationEnabled(request) && order.status.value === "PENDING"
        && order.dueDate.getTime() > Date.now() && { canSimulatePayment: true }),
    });
  };

  simulate = async (request: Request<{ auctionId: string }>, response: Response): Promise<void> => {
    const secret = this.simulationSecret;
    if (!secret || !this.simulationEnabled(request)) {
      throw new ApiError(404, "SIMULATION_UNAVAILABLE", "Local payment simulation is unavailable");
    }
    const order = await this.getOrder(request, response);
    if (order.status.value !== "PENDING" || order.dueDate.getTime() <= Date.now()) {
      throw new ApiError(409, "PAYMENT_NOT_PENDING", "Payment order is not pending within its deadline");
    }
    const payload = JSON.stringify({
      eventId: randomUUID(),
      paymentOrderId: order.id.value,
      result: "SUCCESS",
      occurredAt: new Date().toISOString(),
    });
    const signature = createHmac("sha256", secret).update(payload).digest("hex");
    const host = request.socket.localAddress === "::1" ? "[::1]" : "127.0.0.1";
    const result = await fetch(`http://${host}:${request.socket.localPort}/payments/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Payment-Signature": signature },
      body: payload,
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    });
    if (!result.ok) throw new ApiError(502, "SIMULATION_FAILED", "Payment webhook rejected the simulation");
    const outcome = (await result.json()).outcome;
    if (outcome !== "CONFIRMED" && outcome !== "ALREADY_CONFIRMED") {
      throw new ApiError(409, "PAYMENT_NOT_PENDING", "Payment order could not be confirmed");
    }
    response.status(204).end();
  };

  private simulationEnabled(request: Request): boolean {
    return (this.simulationSecret?.length ?? 0) >= 32
      && ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(request.socket.remoteAddress ?? "");
  }

  private getOrder(request: Request<{ auctionId: string }>, response: Response) {
    const userId: unknown = response.locals.authenticatedUserId;
    if (typeof userId !== "string" || userId.length === 0) {
      throw new Error("Authenticated user ID is missing");
    }
    return this.getPaymentOrderUseCase.execute(request.params.auctionId, userId);
  }
}
