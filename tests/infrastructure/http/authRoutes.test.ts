
import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { LoginUserUseCase } from "../../../src/application/use-cases/LoginUserUseCase.js";
import { RegisterUserUseCase } from "../../../src/application/use-cases/RegisterUserUseCase.js";
import { AuthController } from "../../../src/infrastructure/http/controllers/AuthController.js";
import { createAuthRouter } from "../../../src/infrastructure/http/routes/authRoutes.js";
import { errorHandler } from "../../../src/infrastructure/http/middlewares/errorHandler.js";
import { InMemoryUserRepository } from "../../../src/infrastructure/persistence/memory/InMemoryUserRepository.js";
import { JwtTokenService } from "../../../src/infrastructure/security/JwtTokenService.js";
import { ScryptPasswordHasher } from "../../../src/infrastructure/security/ScryptPasswordHasher.js";

const TEST_SECRET =
  "test-secret-0123456789-abcdefghijklmnopqrstuvwxyz";

function createFixture() {
  const app = express();
  app.use(express.json());

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

  const tokenService = new JwtTokenService(
    TEST_SECRET,
    3600,
  );

  const authController = new AuthController(
    loginUser,
    tokenService,
    3600,
  );

  app.use("/auth", createAuthRouter(authController));
  app.use(errorHandler);

  return {
    app,
    registerUser,
    tokenService,
  };
}

async function registerTestUser(
  registerUser: RegisterUserUseCase,
): Promise<void> {
  await registerUser.execute({
    userId: "user-test-001",
    name: "Test User",
    email: "test@example.com",
    password: "TestPassword123!",
  });
}

describe("POST /auth/login - RF-02", () => {
  it("RF-02 should return a JWT for valid credentials", async () => {
    const { app, registerUser } = createFixture();

    await registerTestUser(registerUser);

    const response = await request(app)
      .post("/auth/login")
      .send({
        email: "test@example.com",
        password: "TestPassword123!",
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      tokenType: "Bearer",
      expiresIn: 3600,
    });

    expect(response.body.accessToken).toEqual(
      expect.any(String),
    );
  });

  it("RF-02 should include the authenticated user ID in the token", async () => {
    const { app, registerUser, tokenService } =
      createFixture();

    await registerTestUser(registerUser);

    const response = await request(app)
      .post("/auth/login")
      .send({
        email: "test@example.com",
        password: "TestPassword123!",
      });

    expect(response.status).toBe(200);

    const token: unknown = response.body.accessToken;
    expect(typeof token).toBe("string");

    if (typeof token !== "string") {
      throw new Error("Expected JWT access token");
    }

    expect(tokenService.verify(token)).toBe(
      "user-test-001",
    );
  });

  it("RF-02 should reject an incorrect password with HTTP 401", async () => {
    const { app, registerUser } = createFixture();

    await registerTestUser(registerUser);

    const response = await request(app)
      .post("/auth/login")
      .send({
        email: "test@example.com",
        password: "WrongPassword123!",
      });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      },
    });
  });

  it("RF-02 should reject an unknown user with HTTP 401", async () => {
    const { app } = createFixture();

    const response = await request(app)
      .post("/auth/login")
      .send({
        email: "unknown@example.com",
        password: "TestPassword123!",
      });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe(
      "INVALID_CREDENTIALS",
    );
  });

  it("RF-02 should reject missing credentials with HTTP 400", async () => {
    const { app } = createFixture();

    const response = await request(app)
      .post("/auth/login")
      .send({ email: "test@example.com" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: "INVALID_REQUEST",
        message: "Email and password are required",
      },
    });
  });

  it("RNF-16 should never expose password data in the login response", async () => {
    const { app, registerUser } = createFixture();

    await registerTestUser(registerUser);

    const response = await request(app)
      .post("/auth/login")
      .send({
        email: "test@example.com",
        password: "TestPassword123!",
      });

    expect(response.status).toBe(200);
    expect(response.body).not.toHaveProperty("password");
    expect(response.body).not.toHaveProperty("hashedPassword");
    expect(response.body).not.toHaveProperty("passwordHash");
  });
});
