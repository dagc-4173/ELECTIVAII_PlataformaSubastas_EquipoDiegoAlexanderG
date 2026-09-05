import { User } from "../entities/User.js";
import { Email } from "../value-objects/Email.js";
import { UserId } from "../value-objects/UserId.js";

export interface UserRepository {
  save(user: User): Promise<void>;
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
}