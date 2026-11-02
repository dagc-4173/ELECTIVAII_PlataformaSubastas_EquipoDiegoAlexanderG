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

  it("RF-02 should verify a correct password", async () => {
    const hasher = new ScryptPasswordHasher();
    const hash = await hasher.hash("secret123");

    await expect(
      hasher.verify("secret123", hash),
    ).resolves.toBe(true);
  });

  it("RF-02 should reject an incorrect password", async () => {
    const hasher = new ScryptPasswordHasher();
    const hash = await hasher.hash("secret123");

    await expect(
      hasher.verify("wrongPassword", hash),
    ).resolves.toBe(false);
  });

  it("RF-02 should reject a malformed password hash", async () => {
    const hasher = new ScryptPasswordHasher();

    await expect(
      hasher.verify("secret123", "invalid-hash"),
    ).resolves.toBe(false);
  });
});