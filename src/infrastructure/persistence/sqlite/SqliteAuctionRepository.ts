import type { DatabaseSync } from "node:sqlite";
import type { AuctionPhoto, AuctionRepository } from "../../../domain/ports/AuctionRepository.js";
import type { Auction } from "../../../domain/entities/Auction.js";
import type { AuctionId } from "../../../domain/value-objects/AuctionId.js";
import { ApiError } from "../../http/errors/ApiError.js";
import { BusinessRuleViolationError } from "../../../domain/errors/BusinessRuleViolationError.js";
import { deserializeAuction, serializeAuction } from "./AuctionDocument.js";

export class SqliteAuctionRepository implements AuctionRepository {
  private readonly revisions = new WeakMap<Auction, number>();

  constructor(private readonly db: DatabaseSync) {}

  async save(auction: Auction, photo?: AuctionPhoto): Promise<void> {
    const document = serializeAuction(auction);
    const revision = this.revisions.get(auction);
    if (revision === undefined) {
      const inserted = this.db.prepare(
        "INSERT INTO auctions(id, document, photo_type, photo_bytes) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO NOTHING",
      ).run(auction.id.value, document, photo?.contentType ?? null, photo?.bytes ?? null);
      if (inserted.changes === 0) throw new BusinessRuleViolationError("Auction ID is already registered");
      this.revisions.set(auction, 0);
      return;
    }
    const updated = this.db.prepare("UPDATE auctions SET document = ?, revision = revision + 1 WHERE id = ? AND revision = ?")
      .run(document, auction.id.value, revision);
    if (updated.changes === 0) {
      throw new ApiError(409, "CONCURRENT_MODIFICATION", "Auction changed; reload and retry the operation");
    }
    this.revisions.set(auction, revision + 1);
  }

  findPhoto(id: string) {
    return this.db.prepare(
      "SELECT photo_type, photo_bytes FROM auctions WHERE id = ? AND photo_bytes IS NOT NULL",
    ).get(id);
  }

  async findById(id: AuctionId): Promise<Auction | null> {
    const row = this.db.prepare("SELECT id, document, revision FROM auctions WHERE id = ?").get(id.value);
    return row === undefined ? null : this.toAuction(row);
  }

  async findAll(): Promise<readonly Auction[]> {
    return this.db.prepare("SELECT id, document, revision FROM auctions ORDER BY rowid").all().map((row) => this.toAuction(row));
  }

  private toAuction(row: Record<string, unknown>): Auction {
    if (typeof row.document !== "string") throw new Error("Invalid stored auction");
    try {
      const auction = deserializeAuction(row.document);
      if (auction.id.value !== row.id) throw new Error("Stored auction ID mismatch");
      if (typeof row.revision !== "number") throw new Error("Invalid stored auction revision");
      this.revisions.set(auction, row.revision);
      return auction;
    } catch (cause) {
      throw new Error("Cannot restore stored auction", { cause });
    }
  }
}
