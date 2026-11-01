
import type { RequestHandler } from "express";

import type { TokenService } from "../../../application/ports/TokenService.js";

export function createAuthenticate(
  tokenService: TokenService,
): RequestHandler {
  return (request, response, next): void => {
    const authorization = request.headers.authorization;

    if (!authorization) {
      response.status(401).json({
        error: {
          code: "AUTHENTICATION_REQUIRED",
          message: "Authentication token is required",
        },
      });
      return;
    }

    const parts = authorization.split(" ");

    if (
      parts.length !== 2 ||
      parts[0] !== "Bearer" ||
      !parts[1]
    ) {
      response.status(401).json({
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid authentication token",
        },
      });
      return;
    }

    const userId = tokenService.verify(parts[1]);

    if (userId === null) {
      response.status(401).json({
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid or expired authentication token",
        },
      });
      return;
    }

    response.locals.authenticatedUserId = userId;

    next();
  };
}

