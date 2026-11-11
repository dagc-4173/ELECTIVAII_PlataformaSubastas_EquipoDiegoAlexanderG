import type { DatabaseSync } from "node:sqlite";
import type { PaymentEventStore, PaymentOutcome } from "../../../application/use-cases/ProcessPaymentEventUseCase.js";
import type { PaymentEvent } from "../../../domain/entities/PaymentEvent.js";
import { ApiError } from "../../http/errors/ApiError.js";
import { deserializeAuction, serializeAuction } from "./AuctionDocument.js";

export class SqlitePaymentEventStore implements PaymentEventStore {
  constructor(private readonly db: DatabaseSync) {}

  process(event: PaymentEvent, apply: Parameters<PaymentEventStore["process"]>[1]): PaymentOutcome {
    const fingerprint = JSON.stringify([event.paymentOrderId.value, event.result, event.date.toISOString()]);
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const previous = this.db.prepare("SELECT fingerprint, outcome FROM payment_events WHERE id = ?").get(event.id.value);
      if (previous) {
        if (previous.fingerprint !== fingerprint) {
          throw new ApiError(409, "PAYMENT_EVENT_CONFLICT", "Payment event ID already has different data");
        }
        this.db.exec("COMMIT");
        return previous.outcome as PaymentOutcome;
      }

      const row = this.db.prepare(
        "SELECT document FROM auctions WHERE json_extract(document, '$.paymentOrder.id') = ?",
      ).get(event.paymentOrderId.value);
      const auction = row ? deserializeAuction(String(row.document)) : null;
      const { outcome, changed } = apply(auction);
      if (changed && auction) {
        this.db.prepare("UPDATE auctions SET document = ?, revision = revision + 1 WHERE id = ?")
          .run(serializeAuction(auction), auction.id.value);
      }
      this.db.prepare("INSERT INTO payment_events (id, fingerprint, outcome) VALUES (?, ?, ?)")
        .run(event.id.value, fingerprint, outcome);
      this.db.exec("COMMIT");
      return outcome;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
}
