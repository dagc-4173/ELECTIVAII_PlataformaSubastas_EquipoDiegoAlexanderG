import type { RequestHandler } from "express";
import { ApiError } from "../errors/ApiError.js";

type FieldType = "string" | "number" | "date";
type BodyShape = Readonly<Record<string, FieldType>>;

export const requireJson: RequestHandler = (request, _response, next): void => {
  if (!/^application\/json(?:\s*;|$)/i.test(request.get("Content-Type")?.trim() ?? "")) {
    next(new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type must be application/json"));
    return;
  }
  next();
};

function validDate(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match || !Number.isFinite(Date.parse(value))) return false;
  const [, year, month, day, hour, minute, second] = match;
  const calendar = new Date(0);
  calendar.setUTCFullYear(Number(year), Number(month) - 1, Number(day));
  return calendar.getUTCFullYear() === Number(year) && calendar.getUTCMonth() === Number(month) - 1 &&
    calendar.getUTCDate() === Number(day) && Number(hour) < 24 && Number(minute) < 60 && Number(second) < 60;
}

export function validateBody(shape: BodyShape): RequestHandler {
  return (request, _response, next): void => {
    const body: unknown = request.body;
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      next(new ApiError(400, "INVALID_REQUEST", "A JSON object body is required")); return;
    }
    for (const [field, type] of Object.entries(shape)) {
      const value: unknown = (body as Record<string, unknown>)[field];
      const valid = type === "number" ? typeof value === "number" && Number.isFinite(value)
        : type === "date" ? validDate(value)
        : typeof value === "string" && value.trim().length > 0;
      if (!valid) {
        next(new ApiError(400, "INVALID_REQUEST", `Invalid or missing field: ${field}`)); return;
      }
    }
    next();
  };
}

export const validateAuctionParams: RequestHandler = (request, _response, next): void => {
  const auctionId: unknown = request.params.auctionId;
  if (typeof auctionId !== "string" || auctionId.trim().length === 0) {
    next(new ApiError(400, "INVALID_REQUEST", "Auction ID is required")); return;
  }
  next();
};

export const validateAuctionQuery: RequestHandler = (request, _response, next): void => {
  const query = request.query;
  for (const key of ["categoryId", "status", "page", "pageSize"] as const) {
    const value: unknown = query[key];
    if (value !== undefined && (typeof value !== "string" || value.trim().length === 0)) {
      next(new ApiError(400, "INVALID_REQUEST", `Query parameter ${key} must be a non-empty string`)); return;
    }
  }
  const states = ["OPEN", "CLOSED", "CANCELLED", "DESERTED", "DEFAULTED"];
  if (query.status !== undefined && !states.includes(String(query.status))) {
    next(new ApiError(400, "INVALID_REQUEST", "Unknown auction status")); return;
  }
  for (const key of ["page", "pageSize"] as const) {
    const value = query[key];
    if (value !== undefined && (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value)))) {
      next(new ApiError(400, "INVALID_REQUEST", `${key} must be a positive safe integer`)); return;
    }
  }
  if (!Number.isSafeInteger((Number(query.page ?? 1) - 1) * Number(query.pageSize ?? 10))) {
    next(new ApiError(400, "INVALID_REQUEST", "Pagination offset is too large")); return;
  }
  next();
};

export const validateUserRegistration = validateBody({ userId: "string", name: "string", email: "string", password: "string" });
export const validateAuctionPublication = validateBody({ auctionId: "string", itemId: "string", categoryId: "string",
  basePrice: "number", minimumIncrement: "number", publishedAt: "date", closesAt: "date" });
export const validateBid = validateBody({ bidId: "string", amount: "number", rejectedBidAttemptId: "string" });
