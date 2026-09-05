import type {
  ErrorRequestHandler,
  NextFunction,
  Request,
  Response,
} from "express";

import { ApiError } from "../errors/ApiError.js";
import { NotFoundError } from "../../../application/errors/NotFoundError.js";

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void => {
  if (error instanceof ApiError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });

    return;
  }

  if (error instanceof NotFoundError) {
    response.status(404).json({
      error: {
        code: "RESOURCE_NOT_FOUND",
        message: error.message,
      },
    });

    return;
  }

  if (error instanceof Error) {
    console.error("Application error:", error);

    response.status(400).json({
      error: {
        code: "BUSINESS_RULE_VIOLATION",
        message: error.message,
      },
    });

    return;
  }

  console.error("Unhandled error:", error);

  response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Unexpected server error",
    },
  });
};