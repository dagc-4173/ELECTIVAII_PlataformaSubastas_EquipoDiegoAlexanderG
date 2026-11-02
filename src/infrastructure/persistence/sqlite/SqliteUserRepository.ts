import type { DatabaseSync } from "node:sqlite";
import type { UserRepository } from "../../../domain/ports/UserRepository.js";
import { User } from "../../../domain/entities/User.js";
import { UserId } from "../../../domain/value-objects/UserId.js";
import { Email } from "../../../domain/value-objects/Email.js";
import { BusinessRuleViolationError } from "../../../domain/errors/BusinessRuleViolationError.js";

export class SqliteUserRepository implements UserRepository {
  private readonly knownUsers = new WeakSet<User>();

  constructor(private readonly db: DatabaseSync) {}

  async save(user: User): Promise<void> {
    try {
      const values = [user.id.value, user.name, user.email.value, user.hashedPassword];
      if (this.knownUsers.has(user)) {
        this.db.prepare("UPDATE users SET name = ?, email = ?, password_hash = ? WHERE id = ?")
          .run(user.name, user.email.value, user.hashedPassword, user.id.value);
      } else {
        this.db.prepare("INSERT INTO users(id, name, email, password_hash) VALUES (?, ?, ?, ?)")
          .run(...values);
      }
      this.knownUsers.add(user);
    } catch (error) {
      if (error instanceof Error && error.message.includes("UNIQUE constraint failed: users.email")) {
        throw new BusinessRuleViolationError("Email is already registered");
      }
      if (error instanceof Error && error.message.includes("UNIQUE constraint failed: users.id")) {
        throw new BusinessRuleViolationError("User ID is already registered");
      }
      throw error;
    }
  }

  async findById(id: UserId): Promise<User | null> {
    return this.toUser(this.db.prepare("SELECT * FROM users WHERE id = ?").get(id.value));
  }

  async findByEmail(email: Email): Promise<User | null> {
    return this.toUser(this.db.prepare("SELECT * FROM users WHERE email = ?").get(email.value));
  }

  private toUser(row: Record<string, unknown> | undefined): User | null {
    if (row === undefined) return null;
    if (typeof row.id !== "string" || typeof row.name !== "string" ||
        typeof row.email !== "string" || typeof row.password_hash !== "string") {
      throw new Error("Invalid stored user");
    }
    const user = User.create(UserId.create(row.id), row.name, Email.create(row.email), row.password_hash);
    this.knownUsers.add(user);
    return user;
  }
}
