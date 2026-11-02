import type {ErrorRequestHandler,
  NextFunction,
  Request,
  Response,
} from "express";

import { ApiError } from "../errors/ApiError.js";
import { NotFoundError } from "../../../application/errors/NotFoundError.js";
import { InvalidCredentialsError } from "../../../application/errors/InvalidCredentialsError.js";
import { ForbiddenOperationError } from "../../../domain/errors/ForbiddenOperationError.js";
import { BusinessRuleViolationError } from "../../../domain/errors/BusinessRuleViolationError.js";


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

  if (error instanceof InvalidCredentialsError) {
    response.status(401).json({
      error: {
        code: "INVALID_CREDENTIALS",
        message: error.message,
      },
    });

    return;
  }

  if (error instanceof ForbiddenOperationError) {
    response.status(403).json({
      error: {
        code: "FORBIDDEN_OPERATION",
        message: error.message,
      },
    });

    return;
  }

  if (error instanceof BusinessRuleViolationError) {
    response.status(400).json({
      error: {
        code: "BUSINESS_RULE_VIOLATION",
        message: error.message,
      },
    });

    return;
  }

  
  if (error instanceof Error) {
    console.error("Unexpected application error:", error);

    response.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unexpected server error",
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