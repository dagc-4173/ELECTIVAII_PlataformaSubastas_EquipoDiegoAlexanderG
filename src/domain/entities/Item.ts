import { ItemId } from "../value-objects/ItemId.js";

export class Item {
  private constructor(
    private readonly itemId: ItemId,
    private readonly itemName: string,
    private readonly itemDescription: string,
    private readonly itemCondition: string,
  ) {}

  static create(
    id: ItemId,
    name: string,
    description: string,
    condition: string,
  ): Item {
    const normalizedName = name.trim();
    const normalizedDescription = description.trim();
    const normalizedCondition = condition.trim();

    if (normalizedName.length === 0) {
      throw new Error("Item name cannot be empty");
    }

    if (normalizedDescription.length === 0) {
      throw new Error("Item description cannot be empty");
    }

    if (normalizedCondition.length === 0) {
      throw new Error("Item condition cannot be empty");
    }

    return new Item(
      id,
      normalizedName,
      normalizedDescription,
      normalizedCondition,
    );
  }

  get id(): ItemId {
    return this.itemId;
  }

  get name(): string {
    return this.itemName;
  }

  get description(): string {
    return this.itemDescription;
  }

  get condition(): string {
    return this.itemCondition;
  }
}