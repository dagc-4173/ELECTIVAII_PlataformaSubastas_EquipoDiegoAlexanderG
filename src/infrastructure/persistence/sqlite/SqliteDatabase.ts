import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export function openDatabase(path: string): DatabaseSync {
  if (path.trim().length === 0) throw new Error("DATABASE_PATH must not be empty");
  if (path !== ":memory:") mkdirSync(dirname(resolve(path)), { recursive: true });
  const db = new DatabaseSync(path, { timeout: 5000 });
  try {
    db.exec("PRAGMA foreign_keys = ON; BEGIN IMMEDIATE");
    const version = db.prepare("PRAGMA user_version").get()?.user_version;
    if (typeof version !== "number" || !Number.isInteger(version) || version < 0 || version > 4) {
      throw new Error("Unsupported database schema version");
    }
    if (version === 0) {
      db.exec(`CREATE TABLE users (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL
        );
        CREATE TABLE auctions (
          id TEXT PRIMARY KEY NOT NULL,
          document TEXT NOT NULL CHECK(json_valid(document)),
          revision INTEGER NOT NULL DEFAULT 0
        );`);
    }
    if (version === 0 || version === 1) {
      db.exec(`ALTER TABLE auctions ADD COLUMN photo_type TEXT;
        ALTER TABLE auctions ADD COLUMN photo_bytes BLOB;
        PRAGMA user_version = 2;`);
    }
    if (version < 3) {
      db.exec(`CREATE TABLE password_resets (
          user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          token_hash TEXT NOT NULL UNIQUE,
          expires_at INTEGER NOT NULL
        );
        PRAGMA user_version = 3;`);
    }
    if (version < 4) {
      db.exec(`CREATE TABLE payment_events (
          id TEXT PRIMARY KEY NOT NULL,
          fingerprint TEXT NOT NULL,
          outcome TEXT NOT NULL
        );
        CREATE INDEX auction_payment_order ON auctions(json_extract(document, '$.paymentOrder.id'));
        PRAGMA user_version = 4;`);
    }
    db.exec("COMMIT");
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}
