
import type { RequestHandler } from "express";

import type { TokenService } from "../../../application/ports/TokenService.js";
import type { UserRepository } from "../../../domain/ports/UserRepository.js";
import { UserId } from "../../../domain/value-objects/UserId.js";

export function createAuthenticate(
  tokenService: TokenService,
  userRepository: UserRepository,
): RequestHandler {
  return async (request, response, next): Promise<void> => {
    try {
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

      const user = await userRepository.findById(
        UserId.create(userId),
      );

      if (user === null) {
        response.status(401).json({
          error: {
            code: "INVALID_TOKEN",
            message: "Invalid authentication token",
          },
        });
        return;
      }

      response.locals.authenticatedUserId = user.id.value;
      next();
    } catch (error: unknown) {
      next(error);
    }
  };
}
