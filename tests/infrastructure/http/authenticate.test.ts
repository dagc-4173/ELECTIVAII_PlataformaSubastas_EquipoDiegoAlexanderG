
import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { JwtTokenService } from "../../../src/infrastructure/security/JwtTokenService.js";
import { createAuthenticate } from "../../../src/infrastructure/http/middlewares/authenticate.js";

const SECRET =
  "test-secret-0123456789-abcdefghijklmnopqrstuvwxyz";

function createFixture() {
  const app = express();
  const tokenService = new JwtTokenService(SECRET);

  app.get(
    "/protected",
    createAuthenticate(tokenService),
    (_request, response) => {
      response.status(200).json({
        userId: response.locals.authenticatedUserId,
      });
    },
  );

  return { app, tokenService };
}

describe("JWT authentication middleware", () => {
  it("should allow a request with a valid token", async () => {
    const { app, tokenService } = createFixture();

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
    const { app } = createFixture();

    const response = await request(app)
      .get("/protected");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe(
      "AUTHENTICATION_REQUIRED",
    );
  });

  it("should reject a malformed authorization header", async () => {
    const { app } = createFixture();

    const response = await request(app)
      .get("/protected")
      .set("Authorization", "InvalidHeader");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe(
      "INVALID_TOKEN",
    );
  });

  it("should reject an invalid token", async () => {
    const { app } = createFixture();

    const response = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer invalid.token.value");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe(
      "INVALID_TOKEN",
    );
  });

  it("should reject a token signed with another secret", async () => {
    const { app } = createFixture();

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
});

