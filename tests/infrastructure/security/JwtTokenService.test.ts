
import { describe, expect, it, vi } from "vitest";

import { JwtTokenService } from "../../../src/infrastructure/security/JwtTokenService.js";

const SECRET = "test-secret-0123456789-abcdefghijklmnopqrstuvwxyz";
const OTHER_SECRET = "other-secret-0123456789-abcdefghijklmnopqrstuvwxyz";

describe("JwtTokenService - RF-02", () => {
  it("RF-02 should generate and verify a valid JWT", () => {
    const service = new JwtTokenService(SECRET);

    const token = service.generate("user-001");

    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
    expect(service.verify(token)).toBe("user-001");
  });

  it("RF-02 should reject a manipulated JWT", () => {
    const service = new JwtTokenService(SECRET);

    const token = service.generate("user-001");

    const parts = token.split(".");
    const signature = parts[2];

    if (signature === undefined) {
      throw new Error("JWT signature is missing");
    }

    const changedSignature =
      (signature[0] === "A" ? "B" : "A") +
      signature.slice(1);

    const manipulatedToken = [
      parts[0],
      parts[1],
      changedSignature,
    ].join(".");

    expect(service.verify(manipulatedToken)).toBeNull();
  });

  it("RF-02 should reject a JWT signed with another secret", () => {
    const issuer = new JwtTokenService(SECRET);
    const verifier = new JwtTokenService(OTHER_SECRET);

    const token = issuer.generate("user-001");

    expect(verifier.verify(token)).toBeNull();
  });

  it("RF-02 should reject an expired JWT", () => {
    const service = new JwtTokenService(SECRET, 1);

    vi.useFakeTimers();

    try {
      vi.setSystemTime(new Date("2026-11-01T12:00:00Z"));

      const token = service.generate("user-001");

      expect(service.verify(token)).toBe("user-001");

      vi.setSystemTime(new Date("2026-11-01T12:00:02Z"));

      expect(service.verify(token)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("should reject an insufficient JWT secret", () => {
    expect(
      () => new JwtTokenService("short-secret"),
    ).toThrow("JWT secret must contain at least 32 characters");
  });
});
