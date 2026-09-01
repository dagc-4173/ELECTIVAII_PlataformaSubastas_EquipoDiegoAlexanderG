import { describe, expect, it } from "vitest";

import { ItemId } from "../../../src/domain/value-objects/ItemId.js";

describe("ItemId", () => {
  it("should create a valid item id", () => {
    const itemId = ItemId.create("item-001");

    expect(itemId.value).toBe("item-001");
  });

  it("should trim surrounding spaces", () => {
    const itemId = ItemId.create("  item-001  ");

    expect(itemId.value).toBe("item-001");
  });

  it("should reject an empty item id", () => {
    expect(() => ItemId.create("   ")).toThrow(
      "Item id cannot be empty",
    );
  });

  it("should compare item ids by value", () => {
    const firstId = ItemId.create("item-001");
    const secondId = ItemId.create("item-001");

    expect(firstId.equals(secondId)).toBe(true);
  });
});