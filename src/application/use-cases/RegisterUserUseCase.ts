import type { UserRepository } from "../../domain/ports/UserRepository.js";
import { User } from "../../domain/entities/User.js";
import { Email } from "../../domain/value-objects/Email.js";
import { UserId } from "../../domain/value-objects/UserId.js";

export interface RegisterUserInput {
  userId: string;
  name: string;
  email: string;
  passwordHash: string;
}

export class RegisterUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: RegisterUserInput): Promise<User> {
    const email = Email.create(input.email);

    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser !== null) {
      throw new Error("Email is already registered");
    }

    const user = User.create(
      UserId.create(input.userId),
      input.name,
      email,
      input.passwordHash,
    );

    await this.userRepository.save(user);

    return user;
  }
}