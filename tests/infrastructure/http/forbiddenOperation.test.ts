
import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { ForbiddenOperationError } from "../../../src/domain/errors/ForbiddenOperationError.js";
import { errorHandler } from "../../../src/infrastructure/http/middlewares/errorHandler.js";

describe("Forbidden operation HTTP handling", () => {
  it("RF-07 should return HTTP 403 for an unauthorized cancellation", async () => {
    const app = express();

    app.delete("/test-auction", () => {
      throw new ForbiddenOperationError(
        "Only the auction seller can cancel the auction",
      );
    });

    app.use(errorHandler);

    const response = await request(app).delete("/test-auction");

    expect(response.status).toBe(403);

    expect(response.body).toEqual({
      error: {
        code: "FORBIDDEN_OPERATION",
        message: "Only the auction seller can cancel the auction",
      },
    });
  });

});


