
import { User } from "../../domain/entities/User.js";
import type { UserRepository } from "../../domain/ports/UserRepository.js";
import { Email } from "../../domain/value-objects/Email.js";
import type { PasswordHasher } from "../ports/PasswordHasher.js";
import { InvalidCredentialsError } from "../errors/InvalidCredentialsError.js";

export interface LoginUserInput {
  email: string;
  password: string;
}

export class LoginUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(input: LoginUserInput): Promise<User> {
    const email = Email.create(input.email);

    const user = await this.userRepository.findByEmail(email);

    if (user === null) {
      throw new InvalidCredentialsError();
    }

    const validPassword = await this.passwordHasher.verify(
      input.password,
      user.hashedPassword,
    );

    if (!validPassword) {
      throw new InvalidCredentialsError();
    }

    return user;
  }
}
