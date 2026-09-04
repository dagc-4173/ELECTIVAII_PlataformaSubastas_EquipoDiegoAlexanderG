import { describe, expect, it } from "vitest";

import { Money } from "../../../src/domain/value-objects/Money.js";

describe("Money - RN-21", () => {
  it("should create money with a non-negative integer amount", () => {
    const money = Money.create(5000);

    expect(money.value).toBe(5000);
  });

  it("should reject negative amounts", () => {
    expect(() => Money.create(-1)).toThrow(
      "Money amount cannot be negative",
    );
  });

  it("should reject decimal amounts", () => {
    expect(() => Money.create(1000.5)).toThrow(
      "Money amount must be an integer",
    );
  });
});