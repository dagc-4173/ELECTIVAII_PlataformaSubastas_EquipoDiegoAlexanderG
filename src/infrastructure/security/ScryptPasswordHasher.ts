import {
  randomBytes,
  scrypt as scryptCallback,
} from "node:crypto";

import { promisify } from "node:util";

import type { PasswordHasher } from "../../application/ports/PasswordHasher.js";

const scrypt = promisify(scryptCallback);

export class ScryptPasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    if (password.trim().length === 0) {
      throw new Error("Password cannot be empty");
    }

    const salt = randomBytes(16).toString("hex");

    const derivedKey = (await scrypt(
      password,
      salt,
      64,
    )) as Buffer;

    return `${salt}:${derivedKey.toString("hex")}`;
  }
}