import { describe, expect, it } from "vitest";

import { RegisterUserUseCase } from "../../../src/application/use-cases/RegisterUserUseCase.js";
import { InMemoryUserRepository } from "../../../src/infrastructure/persistence/memory/InMemoryUserRepository.js";
import { Email } from "../../../src/domain/value-objects/Email.js";
import type { PasswordHasher } from "../../../src/application/ports/PasswordHasher.js";
import { UserId } from "../../../src/domain/value-objects/UserId.js";

class FakePasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    return `hashed:${password}`;
  }
}

describe("RegisterUserUseCase - RN-22", () => {
  it("should register a user when the email is not already in use", async () => {
    const repository = new InMemoryUserRepository();
    const passwordHasher = new FakePasswordHasher();
    const useCase = new RegisterUserUseCase(repository, passwordHasher);

    const user = await useCase.execute({
      userId: "user-001",
      name: "Diego",
      email: "diego@example.com",
      password: "secret123",
    });

    const storedUser = await repository.findByEmail(
      Email.create("diego@example.com"),
    );

    expect(storedUser).toBe(user);
    expect(user.id.value).toBe("user-001");
    expect(user.email.value).toBe("diego@example.com");
    expect(user.hashedPassword).toBe("hashed:secret123");
    expect(user.hashedPassword).not.toBe("secret123");
  });

  it("RN-22 should reject registering a second user with the same email", async () => {
    const repository = new InMemoryUserRepository();
    const passwordHasher = new FakePasswordHasher();
    const useCase = new RegisterUserUseCase(repository, passwordHasher);

    await useCase.execute({
      userId: "user-001",
      name: "Diego",
      email: "diego@example.com",
      password: "secret123",
    });

    await expect(
      useCase.execute({
        userId: "user-002",
        name: "Alexander",
        email: "diego@example.com",
        password: "secret123",
      }),
    ).rejects.toThrow("Email is already registered");
  });

  it("RN-22 should preserve the original user when a duplicate email is rejected", async () => {
    const repository = new InMemoryUserRepository();
    const passwordHasher = new FakePasswordHasher();
    const useCase = new RegisterUserUseCase(repository, passwordHasher);

    const originalUser = await useCase.execute({
      userId: "user-001",
      name: "Diego",
      email: "diego@example.com",
      password: "secret123",
    });

    await expect(
      useCase.execute({
        userId: "user-002",
        name: "Alexander",
        email: "diego@example.com",
        password: "secret123",
      }),
    ).rejects.toThrow();

    const storedUser = await repository.findByEmail(
      Email.create("diego@example.com"),
    );

    expect(storedUser).toBe(originalUser);
    expect(storedUser?.id.value).toBe("user-001");
  });

  it("should reject registering a user with an existing user ID", async () => {
    const repository = new InMemoryUserRepository();
    const passwordHasher = new FakePasswordHasher();
    const useCase = new RegisterUserUseCase(repository, passwordHasher);

    await useCase.execute({
      userId: "user-001",
      name: "Diego",
      email: "diego@example.com",
      password: "secret123",
    });

    await expect(
      useCase.execute({
        userId: "user-001",
        name: "Alexander",
        email: "alexander@example.com",
        password: "anotherPassword",
      }),
    ).rejects.toThrow("User ID is already registered");

    const storedUser = await repository.findById(UserId.create("user-001"));

    expect(storedUser?.name).toBe("Diego");
    expect(storedUser?.email.value).toBe("diego@example.com");
  });
});