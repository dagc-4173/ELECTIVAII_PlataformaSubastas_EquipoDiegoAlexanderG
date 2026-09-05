import { describe, expect, it } from "vitest";

import { User } from "../../../../src/domain/entities/User.js";
import { Email } from "../../../../src/domain/value-objects/Email.js";
import { UserId } from "../../../../src/domain/value-objects/UserId.js";
import { InMemoryUserRepository } from "../../../../src/infrastructure/persistence/memory/InMemoryUserRepository.js";

function createUser(
  id: string,
  email: string,
  name = "User",
): User {
  return User.create(
    UserId.create(id),
    name,
    Email.create(email),
    "hashed-password",
  );
}

describe("InMemoryUserRepository", () => {
  it("should save and find a user by ID", async () => {
    const repository = new InMemoryUserRepository();
    const user = createUser("user-001", "user@example.com");

    await repository.save(user);

    const storedUser = await repository.findById(
      UserId.create("user-001"),
    );

    expect(storedUser).toBe(user);
  });

  it("should find a user by email", async () => {
    const repository = new InMemoryUserRepository();
    const user = createUser("user-001", "user@example.com");

    await repository.save(user);

    const storedUser = await repository.findByEmail(
      Email.create("user@example.com"),
    );

    expect(storedUser).toBe(user);
  });

  it("should reject a duplicated email for a different user", async () => {
    const repository = new InMemoryUserRepository();

    await repository.save(
      createUser("user-001", "user@example.com"),
    );

    await expect(
      repository.save(
        createUser("user-002", "user@example.com"),
      ),
    ).rejects.toThrow("Email is already registered");

    const secondUser = await repository.findById(
      UserId.create("user-002"),
    );

    expect(secondUser).toBeNull();
  });
});