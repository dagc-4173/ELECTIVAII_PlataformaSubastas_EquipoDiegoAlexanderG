export class UserId {
  private constructor(private readonly id: string) {}

  static create(id: string): UserId {
    const value = id.trim();

    if (value.length === 0) {
      throw new Error("User id cannot be empty");
    }

    return new UserId(value);
  }

  get value(): string {
    return this.id;
  }

  equals(other: UserId): boolean {
    return this.id === other.id;
  }
}