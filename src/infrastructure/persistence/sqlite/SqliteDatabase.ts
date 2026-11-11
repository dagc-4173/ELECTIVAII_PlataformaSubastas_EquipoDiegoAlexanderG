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
    if (version !== 0 && version !== 1 && version !== 2) throw new Error("Unsupported database schema version");
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
    if (version !== 2) {
      db.exec(`ALTER TABLE auctions ADD COLUMN photo_type TEXT;
        ALTER TABLE auctions ADD COLUMN photo_bytes BLOB;
        PRAGMA user_version = 2;`);
    }
    db.exec("COMMIT");
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}
