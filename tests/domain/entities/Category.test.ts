import { describe, expect, it } from "vitest";

import { Category } from "../../../src/domain/entities/Category.js";
import { CategoryId } from "../../../src/domain/value-objects/CategoryId.js";

describe("Category", () => {
  it("should create a category with a valid id and name", () => {
    const categoryId = CategoryId.create("category-001");

    const category = Category.create(categoryId, "Technology");

    expect(category.id.equals(categoryId)).toBe(true);
    expect(category.name).toBe("Technology");
  });

  it("should trim the category name", () => {
    const category = Category.create(
      CategoryId.create("category-001"),
      "  Technology  ",
    );

    expect(category.name).toBe("Technology");
  });

  it("should reject an empty category name", () => {
    expect(() =>
      Category.create(CategoryId.create("category-001"), "   "),
    ).toThrow("Category name cannot be empty");
  });
});