import type { Request, Response } from "express";
import type { GetPaymentOrderUseCase } from "../../../application/use-cases/GetPaymentOrderUseCase.js";

export class PaymentOrderController {
  constructor(private readonly getPaymentOrderUseCase: GetPaymentOrderUseCase) {}

  get = async (request: Request<{ auctionId: string }>, response: Response): Promise<void> => {
    const userId: unknown = response.locals.authenticatedUserId;
    if (typeof userId !== "string" || userId.length === 0) {
      throw new Error("Authenticated user ID is missing");
    }
    const order = await this.getPaymentOrderUseCase.execute(request.params.auctionId, userId);
    response.status(200).json({
      id: order.id.value,
      auctionId: request.params.auctionId,
      winnerId: order.winner.value,
      amount: order.amount.value,
      status: order.status.value,
      createdAt: order.createdDate.toISOString(),
      dueAt: order.dueDate.toISOString(),
    });
  };
}
