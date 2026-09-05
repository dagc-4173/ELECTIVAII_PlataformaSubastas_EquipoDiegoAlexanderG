import type { AuctionRepository } from "../../domain/ports/AuctionRepository.js";
import { Auction } from "../../domain/entities/Auction.js";

export interface ListAuctionsInput {
  categoryId?: string;
  status?: string;
  page: number;
  pageSize: number;
}

export interface ListAuctionsResult {
  items: readonly Auction[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export class ListAuctionsUseCase {
  constructor(
    private readonly auctionRepository: AuctionRepository,
  ) {}

  async execute(
    input: ListAuctionsInput,
  ): Promise<ListAuctionsResult> {
    if (!Number.isInteger(input.page) || input.page < 1) {
      throw new Error("Page must be a positive integer");
    }

    if (!Number.isInteger(input.pageSize) || input.pageSize < 1) {
      throw new Error("Page size must be a positive integer");
    }

    const auctions = await this.auctionRepository.findAll();

    const filteredAuctions = auctions.filter((auction) => {
      const matchesCategory =
        input.categoryId === undefined ||
        auction.category.value === input.categoryId;

      const matchesStatus =
        input.status === undefined ||
        auction.status.value === input.status;

      return matchesCategory && matchesStatus;
    });

    const totalItems = filteredAuctions.length;
    const totalPages = Math.ceil(totalItems / input.pageSize);

    const startIndex = (input.page - 1) * input.pageSize;
    const endIndex = startIndex + input.pageSize;

    const items = filteredAuctions.slice(
      startIndex,
      endIndex,
    );

    return {
      items,
      page: input.page,
      pageSize: input.pageSize,
      totalItems,
      totalPages,
    };
  }
}