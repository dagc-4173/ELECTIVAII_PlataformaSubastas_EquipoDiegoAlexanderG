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
  if (response.headersSent) { _next(error); return; }
  if (typeof error === "object" && error !== null && "type" in error) {
    const parserErrors: Record<string, { status: number; code: string; message: string }> = {
      "entity.parse.failed": { status: 400, code: "INVALID_JSON", message: "Malformed JSON body" },
      "entity.too.large": { status: 413, code: "PAYLOAD_TOO_LARGE", message: "JSON body exceeds the 100 KiB limit" },
      "charset.unsupported": { status: 415, code: "UNSUPPORTED_MEDIA_TYPE", message: "Unsupported JSON charset" },
      "encoding.unsupported": { status: 415, code: "UNSUPPORTED_MEDIA_TYPE", message: "Unsupported content encoding" },
      "request.aborted": { status: 400, code: "INVALID_REQUEST", message: "Request body was interrupted" },
      "request.size.invalid": { status: 400, code: "INVALID_REQUEST", message: "Invalid request body size" },
    };
    const type = typeof error.type === "string" ? error.type : "";
    if (Object.hasOwn(parserErrors, type)) {
      const failure = parserErrors[type]!;
      response.status(failure.status).json({ error: { code: failure.code, message: failure.message } });
      return;
    }
  }
  if (error instanceof URIError) {
    response.status(400).json({ error: { code: "INVALID_REQUEST", message: "Invalid URL encoding" } });
    return;
  }
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
