import type { UserRepository } from "../../domain/ports/UserRepository.js";
import { User } from "../../domain/entities/User.js";
import { Email } from "../../domain/value-objects/Email.js";
import { UserId } from "../../domain/value-objects/UserId.js";
import type { PasswordHasher } from "../ports/PasswordHasher.js";

export interface RegisterUserInput {
  userId: string;
  name: string;
  email: string;
  password: string;
}

export class RegisterUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(input: RegisterUserInput): Promise<User> {
    const userId = UserId.create(input.userId);
    const email = Email.create(input.email);

    const existingUserById = await this.userRepository.findById(userId);

    if (existingUserById !== null) {
      throw new Error("User ID is already registered");
    }

    const existingUserByEmail = await this.userRepository.findByEmail(email);

    if (existingUserByEmail !== null) {
      throw new Error("Email is already registered");
    }

    const passwordHash = await this.passwordHasher.hash(input.password);

    const user = User.create(userId, input.name, email, passwordHash);

    await this.userRepository.save(user);

    return user;
  }
}