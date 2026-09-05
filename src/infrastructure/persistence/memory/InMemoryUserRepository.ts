import type { UserRepository } from "../../../domain/ports/UserRepository.js";
import { User } from "../../../domain/entities/User.js";
import { Email } from "../../../domain/value-objects/Email.js";
import { UserId } from "../../../domain/value-objects/UserId.js";

export class InMemoryUserRepository implements UserRepository {
  private readonly users: User[] = [];

  async save(user: User): Promise<void> {
    const existingIndex = this.users.findIndex(
      (currentUser) => currentUser.id.equals(user.id),
    );

    if (existingIndex >= 0) {
      this.users[existingIndex] = user;
      return;
    }

    this.users.push(user);
  }

  async findById(id: UserId): Promise<User | null> {
    return (
      this.users.find((user) => user.id.equals(id)) ??
      null
    );
  }

  async findByEmail(email: Email): Promise<User | null> {
    return (
      this.users.find((user) => user.email.equals(email)) ??
      null
    );
  }
}