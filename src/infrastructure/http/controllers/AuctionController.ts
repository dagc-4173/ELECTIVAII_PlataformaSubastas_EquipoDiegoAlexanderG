import type { Request, Response } from "express";

import type { PublishAuctionUseCase } from "../../../application/use-cases/PublishAuctionUseCase.js";
import type { GetAuctionUseCase } from "../../../application/use-cases/GetAuctionUseCase.js";
import type { ListAuctionsUseCase } from "../../../application/use-cases/ListAuctionsUseCase.js";
import type { CancelAuctionUseCase } from "../../../application/use-cases/CancelAuctionUseCase.js";
import type { PlaceBidUseCase } from "../../../application/use-cases/PlaceBidUseCase.js";
import { AuctionResponseMapper } from "../mappers/AuctionResponseMapper.js";

interface PublishAuctionBody {
  auctionId: string;
  sellerId: string;
  itemId: string;
  categoryId: string;
  basePrice: number;
  minimumIncrement: number;
  publishedAt: string;
  closesAt: string;
}

interface AuctionParams {
  auctionId: string;
}

interface PlaceBidBody {
  bidId: string;
  bidderId: string;
  amount: number;
  placedAt: string;
  rejectedBidAttemptId: string;
  paymentOrderId?: string;
}

export class AuctionController {
  constructor(
    private readonly publishAuctionUseCase: PublishAuctionUseCase,
    private readonly getAuctionUseCase: GetAuctionUseCase,
    private readonly listAuctionsUseCase: ListAuctionsUseCase,
    private readonly cancelAuctionUseCase: CancelAuctionUseCase,
    private readonly placeBidUseCase: PlaceBidUseCase,
  ) {}

  publish = async (
    request: Request<object, object, PublishAuctionBody>,
    response: Response,
  ): Promise<void> => {
    const auction = await this.publishAuctionUseCase.execute({
      auctionId: request.body.auctionId,
      sellerId: request.body.sellerId,
      itemId: request.body.itemId,
      categoryId: request.body.categoryId,
      basePrice: request.body.basePrice,
      minimumIncrement: request.body.minimumIncrement,
      publishedAt: new Date(request.body.publishedAt),
      closesAt: new Date(request.body.closesAt),
    });

    response.status(201).json(AuctionResponseMapper.toResponse(auction));
  };

  cancel = async (
    request: Request<AuctionParams>,
    response: Response,
  ): Promise<void> => {
    const auction = await this.cancelAuctionUseCase.execute(
      request.params.auctionId,
    );

    response.status(200).json(AuctionResponseMapper.toResponse(auction));
  };

  placeBid = async (
    request: Request<AuctionParams, object, PlaceBidBody>,
    response: Response,
  ): Promise<void> => {
    const input = {
      auctionId: request.params.auctionId,
      bidId: request.body.bidId,
      bidderId: request.body.bidderId,
      amount: request.body.amount,
      placedAt: new Date(request.body.placedAt),
      rejectedBidAttemptId: request.body.rejectedBidAttemptId,
      ...(request.body.paymentOrderId !== undefined
        ? { paymentOrderId: request.body.paymentOrderId }
        : {}),
    };

    const auction = await this.placeBidUseCase.execute(input);

    response.status(201).json(AuctionResponseMapper.toResponse(auction));
  };

  getById = async (
    request: Request<AuctionParams>,
    response: Response,
  ): Promise<void> => {
    const auction = await this.getAuctionUseCase.execute({
      auctionId: request.params.auctionId,
      currentDate: new Date(),
    });

    if (auction === null) {
      response.status(404).json({
        error: {
          code: "AUCTION_NOT_FOUND",
          message: "Auction not found",
        },
      });

      return;
    }

    response.status(200).json(AuctionResponseMapper.toResponse(auction));
  }

  list = async (_request: Request, response: Response): Promise<void> => {
    const auctions = await this.listAuctionsUseCase.execute();

    response.status(200).json(auctions.map((auction) => AuctionResponseMapper.toResponse(auction)));
  };
}