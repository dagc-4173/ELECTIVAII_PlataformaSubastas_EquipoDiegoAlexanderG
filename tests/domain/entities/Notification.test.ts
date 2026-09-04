import { describe, expect, it } from "vitest";

import { Notification } from "../../../src/domain/entities/Notification.js";
import { NotificationId } from "../../../src/domain/value-objects/NotificationId.js";
import { UserId } from "../../../src/domain/value-objects/UserId.js";

describe("Notification", () => {
  it("should create a notification with valid data", () => {
    const createdAt = new Date("2026-09-03T21:30:00.000Z");

    const notification = Notification.create(
      NotificationId.create("notification-001"),
      UserId.create("user-001"),
      "You have been outbid",
      createdAt,
    );

    expect(notification.id.value).toBe("notification-001");
    expect(notification.recipient.value).toBe("user-001");
    expect(notification.message).toBe("You have been outbid");
    expect(notification.date.toISOString()).toBe(createdAt.toISOString());
  });

  it("should trim the notification message", () => {
    const notification = Notification.create(
      NotificationId.create("notification-001"),
      UserId.create("user-001"),
      "  You have won the auction  ",
      new Date("2026-09-03T21:30:00.000Z"),
    );

    expect(notification.message).toBe("You have won the auction");
  });

  it("should reject an empty notification message", () => {
    expect(() =>
      Notification.create(
        NotificationId.create("notification-001"),
        UserId.create("user-001"),
        "   ",
        new Date("2026-09-03T21:30:00.000Z"),
      ),
    ).toThrow("Notification message cannot be empty");
  });

  it("should reject an invalid creation date", () => {
    expect(() =>
      Notification.create(
        NotificationId.create("notification-001"),
        UserId.create("user-001"),
        "You have won the auction",
        new Date("invalid-date"),
      ),
    ).toThrow("Notification creation date is invalid");
  });

  it("should protect the internal creation date from external mutation", () => {
    const notification = Notification.create(
      NotificationId.create("notification-001"),
      UserId.create("user-001"),
      "You have won the auction",
      new Date("2026-09-03T21:30:00.000Z"),
    );

    const returnedDate = notification.date;
    returnedDate.setFullYear(2030);

    expect(notification.date.toISOString()).toBe(
      "2026-09-03T21:30:00.000Z",
    );
  });
});