import { describe, expect, it } from "vitest";

import { NotificationId } from "../../../src/domain/value-objects/NotificationId.js";

describe("NotificationId", () => {
  it("should create a valid notification id", () => {
    const id = NotificationId.create("notification-001");

    expect(id.value).toBe("notification-001");
  });

  it("should trim surrounding spaces", () => {
    const id = NotificationId.create("  notification-001  ");

    expect(id.value).toBe("notification-001");
  });

  it("should reject an empty notification id", () => {
    expect(() => NotificationId.create("   ")).toThrow(
      "Notification id cannot be empty",
    );
  });

  it("should compare notification ids by value", () => {
    const firstId = NotificationId.create("notification-001");
    const secondId = NotificationId.create("notification-001");

    expect(firstId.equals(secondId)).toBe(true);
  });
});