import type { AuctionPhoto } from "../../domain/ports/AuctionRepository.js";
import { ApiError } from "./errors/ApiError.js";

const maxBytes = 2 * 1024 * 1024;

export function parseAuctionPhoto(value: unknown): AuctionPhoto | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw invalidPhoto();
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  const contentType = match?.[1];
  const encoded = match?.[2];
  if (!encoded || encoded.length % 4 !== 0) throw invalidPhoto();

  const bytes = Buffer.from(encoded, "base64");
  if (bytes.length > maxBytes) {
    throw new ApiError(413, "PHOTO_TOO_LARGE", "Auction photo exceeds 2 MiB");
  }
  if (contentType === "image/jpeg" && bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) {
    return { contentType, bytes };
  }
  if (contentType === "image/png" && bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) {
    return { contentType, bytes };
  }
  if (contentType === "image/webp" && bytes.toString("ascii", 0, 4) === "RIFF"
    && bytes.toString("ascii", 8, 12) === "WEBP") {
    return { contentType, bytes };
  }
  throw invalidPhoto();
}

function invalidPhoto() {
  return new ApiError(400, "INVALID_PHOTO", "Auction photo must be a JPEG, PNG or WebP image");
}
