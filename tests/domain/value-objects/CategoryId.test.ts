import { describe, expect, it } from "vitest";

import { CategoryId } from "../../../src/domain/value-objects/CategoryId.js";

describe("CategoryId", () => {
  it("should create a valid category id", () => {
    const categoryId = CategoryId.create("category-001");

    expect(categoryId.value).toBe("category-001");
  });

  it("should trim surrounding spaces", () => {
    const categoryId = CategoryId.create("  category-001  ");

    expect(categoryId.value).toBe("category-001");
  });

  it("should reject an empty category id", () => {
    expect(() => CategoryId.create("   ")).toThrow(
      "Category id cannot be empty",
    );
  });

  it("should compare category ids by value", () => {
    const firstId = CategoryId.create("category-001");
    const secondId = CategoryId.create("category-001");

    expect(firstId.equals(secondId)).toBe(true);
  });
});