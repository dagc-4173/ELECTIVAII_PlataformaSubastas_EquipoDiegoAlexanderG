export class CategoryId {
  private constructor(private readonly id: string) {}

  static create(id: string): CategoryId {
    const value = id.trim();

    if (value.length === 0) {
      throw new Error("Category id cannot be empty");
    }

    return new CategoryId(value);
  }

  get value(): string {
    return this.id;
  }

  equals(other: CategoryId): boolean {
    return this.id === other.id;
  }
}