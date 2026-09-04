import { Auction } from "../entities/Auction.js";
import { AuctionId } from "../value-objects/AuctionId.js";

export interface AuctionRepository {
  save(auction: Auction): Promise<void>;

  findById(id: AuctionId): Promise<Auction | null>;

  findAll(): Promise<readonly Auction[]>;
}