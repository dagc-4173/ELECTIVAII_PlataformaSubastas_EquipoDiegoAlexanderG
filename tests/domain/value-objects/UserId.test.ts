import { describe, expect, it } from "vitest";

import { UserId } from "../../../src/domain/value-objects/UserId.js";

describe("UserId", () => {
  it("should create a valid user id", () => {
    const userId = UserId.create("user-001");

    expect(userId.value).toBe("user-001");
  });

  it("should trim surrounding spaces", () => {
    const userId = UserId.create("  user-001  ");

    expect(userId.value).toBe("user-001");
  });

  it("should reject an empty user id", () => {
    expect(() => UserId.create("   ")).toThrow(
      "User id cannot be empty",
    );
  });

  it("should compare user ids by value", () => {
    const firstId = UserId.create("user-001");
    const secondId = UserId.create("user-001");

    expect(firstId.equals(secondId)).toBe(true);
  });
});