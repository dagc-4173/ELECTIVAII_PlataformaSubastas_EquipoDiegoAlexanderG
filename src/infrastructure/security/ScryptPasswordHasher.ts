
import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
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

  async verify(
    password: string,
    passwordHash: string,
  ): Promise<boolean> {
    const parts = passwordHash.split(":");

    if (parts.length !== 2) {
      return false;
    }

    const [salt, storedHash] = parts;

    if (
      salt === undefined ||
      storedHash === undefined ||
      !/^[a-f0-9]{32}$/i.test(salt) ||
      !/^[a-f0-9]{128}$/i.test(storedHash)
    ) {
      return false;
    }

    const storedKey = Buffer.from(storedHash, "hex");

    const derivedKey = (await scrypt(
      password,
      salt,
      storedKey.length,
    )) as Buffer;

    return timingSafeEqual(storedKey, derivedKey);
  }
}
