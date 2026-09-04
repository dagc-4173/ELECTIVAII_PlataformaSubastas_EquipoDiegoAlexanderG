import { describe, expect, it } from "vitest";

import { Item } from "../../../src/domain/entities/Item.js";
import { ItemId } from "../../../src/domain/value-objects/ItemId.js";

describe("Item", () => {
  it("should create an item with valid data", () => {
    const item = Item.create(
      ItemId.create("item-001"),
      "Laptop",
      "Laptop for software development",
      "Used",
    );

    expect(item.id.value).toBe("item-001");
    expect(item.name).toBe("Laptop");
    expect(item.description).toBe("Laptop for software development");
    expect(item.condition).toBe("Used");
  });

  it("should trim item fields", () => {
    const item = Item.create(
      ItemId.create("item-001"),
      "  Laptop  ",
      "  Laptop for software development  ",
      "  Used  ",
    );

    expect(item.name).toBe("Laptop");
    expect(item.description).toBe("Laptop for software development");
    expect(item.condition).toBe("Used");
  });

  it("should reject an empty item name", () => {
    expect(() =>
      Item.create(
        ItemId.create("item-001"),
        "   ",
        "Description",
        "Used",
      ),
    ).toThrow("Item name cannot be empty");
  });

  it("should reject an empty item description", () => {
    expect(() =>
      Item.create(
        ItemId.create("item-001"),
        "Laptop",
        "   ",
        "Used",
      ),
    ).toThrow("Item description cannot be empty");
  });

  it("should reject an empty item condition", () => {
    expect(() =>
      Item.create(
        ItemId.create("item-001"),
        "Laptop",
        "Description",
        "   ",
      ),
    ).toThrow("Item condition cannot be empty");
  });
});