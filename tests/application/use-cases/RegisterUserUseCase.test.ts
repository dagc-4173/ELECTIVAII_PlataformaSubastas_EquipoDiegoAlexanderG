import { describe, expect, it } from "vitest";

import { RegisterUserUseCase } from "../../../src/application/use-cases/RegisterUserUseCase.js";
import { InMemoryUserRepository } from "../../../src/infrastructure/persistence/memory/InMemoryUserRepository.js";
import { Email } from "../../../src/domain/value-objects/Email.js";

describe("RegisterUserUseCase - RN-22", () => {
  it("should register a user when the email is not already in use", async () => {
    const repository = new InMemoryUserRepository();
    const useCase = new RegisterUserUseCase(repository);

    const user = await useCase.execute({
      userId: "user-001",
      name: "Diego",
      email: "diego@example.com",
      passwordHash: "hashed-password-001",
    });

    const storedUser = await repository.findByEmail(
      Email.create("diego@example.com"),
    );

    expect(storedUser).toBe(user);
    expect(user.id.value).toBe("user-001");
    expect(user.email.value).toBe("diego@example.com");
  });

  it("RN-22 should reject registering a second user with the same email", async () => {
    const repository = new InMemoryUserRepository();
    const useCase = new RegisterUserUseCase(repository);

    await useCase.execute({
      userId: "user-001",
      name: "Diego",
      email: "diego@example.com",
      passwordHash: "hashed-password-001",
    });

    await expect(
      useCase.execute({
        userId: "user-002",
        name: "Alexander",
        email: "diego@example.com",
        passwordHash: "hashed-password-002",
      }),
    ).rejects.toThrow("Email is already registered");
  });

  it("RN-22 should preserve the original user when a duplicate email is rejected", async () => {
    const repository = new InMemoryUserRepository();
    const useCase = new RegisterUserUseCase(repository);

    const originalUser = await useCase.execute({
      userId: "user-001",
      name: "Diego",
      email: "diego@example.com",
      passwordHash: "hashed-password-001",
    });

    await expect(
      useCase.execute({
        userId: "user-002",
        name: "Alexander",
        email: "diego@example.com",
        passwordHash: "hashed-password-002",
      }),
    ).rejects.toThrow();

    const storedUser = await repository.findByEmail(
      Email.create("diego@example.com"),
    );

    expect(storedUser).toBe(originalUser);
    expect(storedUser?.id.value).toBe("user-001");
  });
});