import { describe, expect, it } from "vitest";

import { ScryptPasswordHasher } from "../../../src/infrastructure/security/ScryptPasswordHasher.js";

describe("ScryptPasswordHasher - RNF-16", () => {
  it("should hash a password without storing the plain text value", async () => {
    const passwordHasher = new ScryptPasswordHasher();

    const password = "secret123";

    const hashedPassword = await passwordHasher.hash(password);

    expect(hashedPassword).not.toBe(password);
    expect(hashedPassword).toContain(":");
  });

  it("should generate different hashes for the same password because of the random salt", async () => {
    const passwordHasher = new ScryptPasswordHasher();

    const firstHash = await passwordHasher.hash("secret123");
    const secondHash = await passwordHasher.hash("secret123");

    expect(firstHash).not.toBe(secondHash);
  });

  it("should reject an empty password", async () => {
    const passwordHasher = new ScryptPasswordHasher();

    await expect(
      passwordHasher.hash("   "),
    ).rejects.toThrow("Password cannot be empty");
  });
});