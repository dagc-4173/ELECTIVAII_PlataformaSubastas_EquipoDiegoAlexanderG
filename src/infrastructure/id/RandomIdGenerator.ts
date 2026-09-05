import { randomUUID } from "node:crypto";

import type { IdGenerator } from "../../application/ports/IdGenerator.js";

export class RandomIdGenerator implements IdGenerator {
  generate(): string {
    return randomUUID();
  }
}