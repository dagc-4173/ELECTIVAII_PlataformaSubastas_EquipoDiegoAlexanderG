import { CategoryId } from "../value-objects/CategoryId.js";

export class Category {
  private constructor(
    private readonly categoryId: CategoryId,
    private readonly categoryName: string,
  ) {}

  static create(id: CategoryId, name: string): Category {
    const normalizedName = name.trim();

    if (normalizedName.length === 0) {
      throw new Error("Category name cannot be empty");
    }

    return new Category(id, normalizedName);
  }

  get id(): CategoryId {
    return this.categoryId;
  }

  get name(): string {
    return this.categoryName;
  }
}