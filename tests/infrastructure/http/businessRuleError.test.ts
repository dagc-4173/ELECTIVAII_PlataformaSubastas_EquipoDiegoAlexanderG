import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { BusinessRuleViolationError } from "../../../src/domain/errors/BusinessRuleViolationError.js";
import { errorHandler } from "../../../src/infrastructure/http/middlewares/errorHandler.js";

describe("Business rule HTTP error handling", () => {
  it("should return HTTP 400 for a business rule violation", async () => {
    const app = express();

    app.get("/test-business-rule", () => {
      throw new BusinessRuleViolationError(
        "Business rule rejected the operation",
      );
    });

    app.use(errorHandler);

    const response = await request(app)
      .get("/test-business-rule");

    expect(response.status).toBe(400);

    expect(response.body).toEqual({
      error: {
        code: "BUSINESS_RULE_VIOLATION",
        message: "Business rule rejected the operation",
      },
    });
  });

  it("should return HTTP 500 without exposing internal errors", async () => {
    const app = express();

    app.get("/test-internal-error", () => {
      throw new Error("Repository connection failed");
    });

    app.use(errorHandler);

    const response = await request(app)
      .get("/test-internal-error");

    expect(response.status).toBe(500);

    expect(response.body).toEqual({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unexpected server error",
      },
    });

    expect(JSON.stringify(response.body)).not.toContain(
      "Repository connection failed",
    );
  });

});
