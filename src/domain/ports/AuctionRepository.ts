import { Auction } from "../entities/Auction.js";
import { AuctionId } from "../value-objects/AuctionId.js";

export interface AuctionPhoto {
  contentType: "image/jpeg" | "image/png" | "image/webp";
  bytes: Uint8Array;
}

export interface AuctionRepository {
  save(auction: Auction, photo?: AuctionPhoto): Promise<void>;

  findById(id: AuctionId): Promise<Auction | null>;

  findAll(): Promise<readonly Auction[]>;
}
