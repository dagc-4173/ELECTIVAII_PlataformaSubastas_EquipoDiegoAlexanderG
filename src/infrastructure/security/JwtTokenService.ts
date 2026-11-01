
import jwt from "jsonwebtoken";

import type { TokenService } from "../../application/ports/TokenService.js";

export class JwtTokenService implements TokenService {
  constructor(
    private readonly secret: string,
    private readonly expiresInSeconds = 3600,
  ) {
    if (secret.length < 32) {
      throw new Error("JWT secret must contain at least 32 characters");
    }

    if (
      !Number.isSafeInteger(expiresInSeconds) ||
      expiresInSeconds <= 0
    ) {
      throw new Error("JWT expiration must be a positive integer");
    }
  }

  generate(userId: string): string {
    if (userId.trim().length === 0) {
      throw new Error("JWT subject cannot be empty");
    }

    return jwt.sign(
      {},
      this.secret,
      {
        algorithm: "HS256",
        subject: userId,
        expiresIn: this.expiresInSeconds,
        issuer: "auction-platform",
        audience: "auction-platform-users",
      },
    );
  }

  verify(token: string): string | null {
    try {
      const payload = jwt.verify(token, this.secret, {
        algorithms: ["HS256"],
        issuer: "auction-platform",
        audience: "auction-platform-users",
      });

      if (
        typeof payload === "string" ||
        typeof payload.sub !== "string" ||
        payload.sub.trim().length === 0
      ) {
        return null;
      }

      return payload.sub;
    } catch {
      return null;
    }
  }
}
