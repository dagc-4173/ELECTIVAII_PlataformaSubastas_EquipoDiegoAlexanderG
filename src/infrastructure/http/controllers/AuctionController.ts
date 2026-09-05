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
}

interface ListAuctionsQuery {
  categoryId?: string;
  status?: string;
  page?: string;
  pageSize?: string;
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

    console.log(`Auction published: ${auction.id.value}`);

    response.status(201).json(AuctionResponseMapper.toResponse(auction));
  };

  cancel = async (
    request: Request<AuctionParams>,
    response: Response,
  ): Promise<void> => {
    const auction = await this.cancelAuctionUseCase.execute(
      request.params.auctionId,
    );

    console.log(`Auction cancelled: ${auction.id.value}`);

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
    };

    const auction = await this.placeBidUseCase.execute(input);

    console.log(`Bid accepted for auction: ${auction.id.value}`);

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
  };

  list = async (
    request: Request<object, object, object, ListAuctionsQuery>,
    response: Response,
  ): Promise<void> => {
    const page = Number(request.query.page ?? "1");
    const pageSize = Number(request.query.pageSize ?? "10");

    const result = await this.listAuctionsUseCase.execute({
      page,
      pageSize,
      ...(request.query.categoryId !== undefined
        ? { categoryId: request.query.categoryId }
        : {}),
      ...(request.query.status !== undefined
        ? { status: request.query.status }
        : {}),
    });

    response.status(200).json({
      items: result.items.map((auction) =>
        AuctionResponseMapper.toResponse(auction),
      ),
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        totalItems: result.totalItems,
        totalPages: result.totalPages,
      },
    });
  };
}