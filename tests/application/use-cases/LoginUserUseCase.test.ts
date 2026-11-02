
import { describe, expect, it } from "vitest";

import { LoginUserUseCase } from "../../../src/application/use-cases/LoginUserUseCase.js";
import { InvalidCredentialsError } from "../../../src/application/errors/InvalidCredentialsError.js";
import { RegisterUserUseCase } from "../../../src/application/use-cases/RegisterUserUseCase.js";
import { InMemoryUserRepository } from "../../../src/infrastructure/persistence/memory/InMemoryUserRepository.js";
import { ScryptPasswordHasher } from "../../../src/infrastructure/security/ScryptPasswordHasher.js";

function createFixture() {
  const repository = new InMemoryUserRepository();
  const passwordHasher = new ScryptPasswordHasher();

  const registerUser = new RegisterUserUseCase(
    repository,
    passwordHasher,
  );

  const loginUser = new LoginUserUseCase(
    repository,
    passwordHasher,
  );

  return { registerUser, loginUser };
}

describe("LoginUserUseCase - RF-02", () => {
  it("RF-02 should authenticate a user with valid credentials", async () => {
    const { registerUser, loginUser } = createFixture();

    await registerUser.execute({
      userId: "user-001",
      name: "Alexander",
      email: "alexander@example.com",
      password: "secret123",
    });

    const user = await loginUser.execute({
      email: "alexander@example.com",
      password: "secret123",
    });

    expect(user.id.value).toBe("user-001");
    expect(user.email.value).toBe("alexander@example.com");
  });

  it("RF-02 should reject an incorrect password", async () => {
    const { registerUser, loginUser } = createFixture();

    await registerUser.execute({
      userId: "user-001",
      name: "Alexander",
      email: "alexander@example.com",
      password: "secret123",
    });

    await expect(
      loginUser.execute({
        email: "alexander@example.com",
        password: "wrongPassword",
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("RF-02 should reject an unregistered email", async () => {
    const { loginUser } = createFixture();

    await expect(
      loginUser.execute({
        email: "unknown@example.com",
        password: "secret123",
      }),
    ).rejects.toThrow("Invalid email or password");
  });
});
