import { describe, expect, it } from "vitest";

import { AuctionPublicationData } from "../../../src/domain/value-objects/AuctionPublicationData.js";
import { Money } from "../../../src/domain/value-objects/Money.js";

describe("AuctionPublicationData - RN-01, RN-02, RN-03", () => {
  it("should create valid auction publication data", () => {
    const publishedAt = new Date("2026-09-03T18:00:00.000Z");
    const closesAt = new Date("2026-09-04T18:00:00.000Z");

    const publicationData = AuctionPublicationData.create(
      Money.create(100000),
      Money.create(5000),
      publishedAt,
      closesAt,
    );

    expect(publicationData.basePrice.value).toBe(100000);
    expect(publicationData.minimumIncrement.value).toBe(5000);
    expect(publicationData.publishedAt.toISOString()).toBe(
      publishedAt.toISOString(),
    );
    expect(publicationData.closesAt.toISOString()).toBe(
      closesAt.toISOString(),
    );
  });

  it("RN-01 should reject a base price equal to zero", () => {
    expect(() =>
      AuctionPublicationData.create(
        Money.create(0),
        Money.create(5000),
        new Date("2026-09-03T18:00:00.000Z"),
        new Date("2026-09-04T18:00:00.000Z"),
      ),
    ).toThrow("Auction base price must be greater than zero");
  });

  it("RN-01 should reject a minimum increment equal to zero", () => {
    expect(() =>
      AuctionPublicationData.create(
        Money.create(100000),
        Money.create(0),
        new Date("2026-09-03T18:00:00.000Z"),
        new Date("2026-09-04T18:00:00.000Z"),
      ),
    ).toThrow("Auction minimum increment must be greater than zero");
  });

  it("RN-02 should reject a closing date equal to the publication date", () => {
    const date = new Date("2026-09-03T18:00:00.000Z");

    expect(() =>
      AuctionPublicationData.create(
        Money.create(100000),
        Money.create(5000),
        date,
        date,
      ),
    ).toThrow("Auction closing date must be after publication date");
  });

  it("RN-02 should reject a closing date before the publication date", () => {
    expect(() =>
      AuctionPublicationData.create(
        Money.create(100000),
        Money.create(5000),
        new Date("2026-09-04T18:00:00.000Z"),
        new Date("2026-09-03T18:00:00.000Z"),
      ),
    ).toThrow("Auction closing date must be after publication date");
  });

  it("RN-03 should reject a duration shorter than one hour", () => {
    expect(() =>
      AuctionPublicationData.create(
        Money.create(100000),
        Money.create(5000),
        new Date("2026-09-03T18:00:00.000Z"),
        new Date("2026-09-03T18:59:59.000Z"),
      ),
    ).toThrow("Auction duration must be at least one hour");
  });

  it("RN-03 should allow a duration of exactly one hour", () => {
    const publicationData = AuctionPublicationData.create(
      Money.create(100000),
      Money.create(5000),
      new Date("2026-09-03T18:00:00.000Z"),
      new Date("2026-09-03T19:00:00.000Z"),
    );

    expect(publicationData).toBeInstanceOf(AuctionPublicationData);
  });

  it("RN-03 should allow a duration of exactly thirty days", () => {
    const publicationData = AuctionPublicationData.create(
      Money.create(100000),
      Money.create(5000),
      new Date("2026-09-03T18:00:00.000Z"),
      new Date("2026-10-03T18:00:00.000Z"),
    );

    expect(publicationData).toBeInstanceOf(AuctionPublicationData);
  });

  it("RN-03 should reject a duration longer than thirty days", () => {
    expect(() =>
      AuctionPublicationData.create(
        Money.create(100000),
        Money.create(5000),
        new Date("2026-09-03T18:00:00.000Z"),
        new Date("2026-10-03T18:00:01.000Z"),
      ),
    ).toThrow("Auction duration cannot exceed thirty days");
  });

  it("should reject an invalid publication date", () => {
    expect(() =>
      AuctionPublicationData.create(
        Money.create(100000),
        Money.create(5000),
        new Date("invalid-date"),
        new Date("2026-09-04T18:00:00.000Z"),
      ),
    ).toThrow("Auction publication date is invalid");
  });

  it("should reject an invalid closing date", () => {
    expect(() =>
      AuctionPublicationData.create(
        Money.create(100000),
        Money.create(5000),
        new Date("2026-09-03T18:00:00.000Z"),
        new Date("invalid-date"),
      ),
    ).toThrow("Auction closing date is invalid");
  });

  it("should protect publication dates from external mutation", () => {
    const publicationData = AuctionPublicationData.create(
      Money.create(100000),
      Money.create(5000),
      new Date("2026-09-03T18:00:00.000Z"),
      new Date("2026-09-04T18:00:00.000Z"),
    );

    const publishedAt = publicationData.publishedAt;
    const closesAt = publicationData.closesAt;

    publishedAt.setFullYear(2030);
    closesAt.setFullYear(2030);

    expect(publicationData.publishedAt.toISOString()).toBe(
      "2026-09-03T18:00:00.000Z",
    );

    expect(publicationData.closesAt.toISOString()).toBe(
      "2026-09-04T18:00:00.000Z",
    );
  });
});