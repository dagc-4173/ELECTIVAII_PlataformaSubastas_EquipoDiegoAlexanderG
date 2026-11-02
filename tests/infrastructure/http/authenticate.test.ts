import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { JwtTokenService } from "../../../src/infrastructure/security/JwtTokenService.js";
import { createAuthenticate } from "../../../src/infrastructure/http/middlewares/authenticate.js";

import { User } from "../../../src/domain/entities/User.js";
import { UserId } from "../../../src/domain/value-objects/UserId.js";
import { Email } from "../../../src/domain/value-objects/Email.js";
import { InMemoryUserRepository } from "../../../src/infrastructure/persistence/memory/InMemoryUserRepository.js";

import { vi } from "vitest";
import { errorHandler } from "../../../src/infrastructure/http/middlewares/errorHandler.js";

const SECRET =
  "test-secret-0123456789-abcdefghijklmnopqrstuvwxyz";


async function createFixture() {
  const app = express();
  const tokenService = new JwtTokenService(SECRET);
  const userRepository = new InMemoryUserRepository();

  await userRepository.save(
    User.create(
      UserId.create("user-001"),
      "Test User",
      Email.create("user001@example.com"),
      "test-password-hash",
    ),
  );

  app.get(
    "/protected",
    createAuthenticate(tokenService, userRepository),
    (_request, response) => {
      response.status(200).json({
        userId: response.locals.authenticatedUserId,
      });
    },
  );

  app.use(errorHandler);

  return { app, tokenService };
}


describe("JWT authentication middleware", () => {
  it("should allow a request with a valid token", async () => {
    const { app, tokenService } = await createFixture();

    const token = tokenService.generate("user-001");

    const response = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      userId: "user-001",
    });
  });

  it("should reject a request without a token", async () => {
    const { app, tokenService } = await createFixture();

    const response = await request(app)
      .get("/protected");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe(
      "AUTHENTICATION_REQUIRED",
    );
  });

  it("should reject a malformed authorization header", async () => {
    const { app, tokenService } = await createFixture();

    const response = await request(app)
      .get("/protected")
      .set("Authorization", "InvalidHeader");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe(
      "INVALID_TOKEN",
    );
  });

  it("should reject an invalid token", async () => {
    const { app, tokenService } = await createFixture();

    const response = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer invalid.token.value");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe(
      "INVALID_TOKEN",
    );
  });

  it("should reject a token signed with another secret", async () => {
    const { app, tokenService } = await createFixture();

    const otherTokenService = new JwtTokenService(
      "another-secret-0123456789-abcdefghijklmnopqrstuvwxyz",
    );

    const token = otherTokenService.generate("user-001");

    const response = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe(
      "INVALID_TOKEN",
    );
  });


  it("should reject a valid JWT belonging to an unknown user", async () => {
    const { app, tokenService } = await createFixture();

    const token = tokenService.generate("unknown-user");

    const response = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_TOKEN");
  });


  it("should propagate repository failures instead of returning 401", async () => {
    const app = express();
    const tokenService = new JwtTokenService(SECRET);
    const userRepository = new InMemoryUserRepository();

    const repositoryError = new Error(
      "Repository connection failed",
    );

    vi.spyOn(userRepository, "findById")
      .mockRejectedValue(repositoryError);

    app.get(
      "/protected",
      createAuthenticate(tokenService, userRepository),
      (_request, response) => {
        response.status(200).json({ success: true });
      },
    );

    const token = tokenService.generate("user-001");

    const response = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).not.toBe(200);
    expect(response.status).not.toBe(401);
  });

});

