import { Email } from "../value-objects/Email.js";
import { UserId } from "../value-objects/UserId.js";

export class User {
  private constructor(
    private readonly userId: UserId,
    private readonly userName: string,
    private readonly userEmail: Email,
    private readonly passwordHash: string,
  ) {}

  static create(
    id: UserId,
    name: string,
    email: Email,
    passwordHash: string,
  ): User {
    const normalizedName = name.trim();
    const normalizedPasswordHash = passwordHash.trim();

    if (normalizedName.length === 0) {
      throw new Error("User name cannot be empty");
    }

    if (normalizedPasswordHash.length === 0) {
      throw new Error("Password hash cannot be empty");
    }

    return new User(
      id,
      normalizedName,
      email,
      normalizedPasswordHash,
    );
  }

  get id(): UserId {
    return this.userId;
  }

  get name(): string {
    return this.userName;
  }

  get email(): Email {
    return this.userEmail;
  }

  get hashedPassword(): string {
    return this.passwordHash;
  }
}