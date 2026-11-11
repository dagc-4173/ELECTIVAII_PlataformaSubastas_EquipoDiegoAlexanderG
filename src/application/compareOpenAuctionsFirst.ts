import type { Auction } from "../domain/entities/Auction.js";

export function compareOpenAuctionsFirst(first: Auction, second: Auction): number {
  return Number(second.status.value === "OPEN") - Number(first.status.value === "OPEN");
}
