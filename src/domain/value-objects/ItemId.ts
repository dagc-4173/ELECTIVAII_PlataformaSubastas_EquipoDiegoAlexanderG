export class ItemId {
  private constructor(private readonly id: string) {}

  static create(id: string): ItemId {
    const value = id.trim();

    if (value.length === 0) {
      throw new Error("Item id cannot be empty");
    }

    return new ItemId(value);
  }

  get value(): string {
    return this.id;
  }

  equals(other: ItemId): boolean {
    return this.id === other.id;
  }
}