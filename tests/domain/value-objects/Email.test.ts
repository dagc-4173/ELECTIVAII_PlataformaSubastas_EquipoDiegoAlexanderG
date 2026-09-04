import { describe, expect, it } from "vitest";

import { Email } from "../../../src/domain/value-objects/Email.js";

describe("Email", () => {
  it("should create and normalize a valid email address", () => {
    const email = Email.create("  User@Example.com  ");

    expect(email.value).toBe("user@example.com");
  });

  it("should reject an empty email address", () => {
    expect(() => Email.create("   ")).toThrow(
      "Email address cannot be empty",
    );
  });

  it("should reject an invalid email address", () => {
    expect(() => Email.create("invalid-email")).toThrow(
      "Email address is invalid",
    );
  });

  it("should compare emails by value", () => {
    const firstEmail = Email.create("user@example.com");
    const secondEmail = Email.create("USER@example.com");

    expect(firstEmail.equals(secondEmail)).toBe(true);
  });
});