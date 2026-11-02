import { describe, expect, it } from "vitest";

import { User } from "../../../src/domain/entities/User.js";
import { Email } from "../../../src/domain/value-objects/Email.js";
import { UserId } from "../../../src/domain/value-objects/UserId.js";
import { BusinessRuleViolationError } from "../../../src/domain/errors/BusinessRuleViolationError.js";

describe("User", () => {
  it("should create a user with valid data", () => {
    const user = User.create(
      UserId.create("user-001"),
      "Alexander",
      Email.create("alexander@example.com"),
      "hashed-password",
    );

    expect(user.id.value).toBe("user-001");
    expect(user.name).toBe("Alexander");
    expect(user.email.value).toBe("alexander@example.com");
    expect(user.hashedPassword).toBe("hashed-password");
  });

  it("should trim the user name", () => {
    const user = User.create(
      UserId.create("user-001"),
      "  Alexander  ",
      Email.create("alexander@example.com"),
      "hashed-password",
    );

    expect(user.name).toBe("Alexander");
  });

  it("should reject an empty user name", () => {
    expect(() =>
      User.create(
        UserId.create("user-001"),
        "   ",
        Email.create("alexander@example.com"),
        "hashed-password",
      ),
    ).toThrow(BusinessRuleViolationError);
  });

  it("should reject an empty password hash", () => {
    expect(() =>
      User.create(
        UserId.create("user-001"),
        "Alexander",
        Email.create("alexander@example.com"),
        "   ",
      ),
    ).toThrow(BusinessRuleViolationError);
  });
});