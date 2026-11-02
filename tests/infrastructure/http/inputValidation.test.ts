import request from "supertest";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../../../src/infrastructure/createApp.js";

let application: ReturnType<typeof createApp>;
let token: string;
const publication = () => ({ auctionId: "validation-auction", itemId: "item", categoryId: "category", basePrice: 100, minimumIncrement: 10,
  publishedAt: new Date().toISOString(), closesAt: new Date(Date.now() + 86400000).toISOString() });

beforeAll(async () => {
  vi.stubEnv("JWT_SECRET", "validation-test-secret-0123456789abcdef");
  application = createApp(":memory:");
  const registered = await request(application.app).post("/users").send({ userId: "validation-user", name: "User", email: "validation@example.com", password: "validation-password" });
  expect(registered.status).toBe(201);
  const login = await request(application.app).post("/auth/login").send({ email: "validation@example.com", password: "validation-password" });
  expect(login.status).toBe(200);
  token = login.body.accessToken;
});
afterAll(async () => { await application.realtime.close(); application.close(); vi.unstubAllEnvs(); });

describe("HTTP input validation and uniform errors", () => {
  it.each([null, [], {}, { userId: 42 }, { userId: "x", name: "User", email: {}, password: "secret" }])("rejects malformed registration without storing a user: %j", async (body) => {
    const response = await request(application.app).post("/users").set("Content-Type", "application/json").send(JSON.stringify(body));
    expect(response.status).toBe(400);
    expect(["INVALID_REQUEST", "INVALID_JSON"]).toContain(response.body.error.code);
    expect(response.body.error.message).toEqual(expect.any(String));
    expect(response.body).not.toHaveProperty("stack");
  });

  it("rejects an empty JSON body with 400 instead of an internal error", async () => {
    const response = await request(application.app).post("/users").set("Content-Type", "application/json");
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_REQUEST");
  });

  it("rejects malformed JSON without exposing submitted credentials", async () => {
    const response = await request(application.app).post("/auth/login").set("Content-Type", "application/json")
      .send('{"password":"private-password",');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: { code: "INVALID_JSON", message: "Malformed JSON body" } });
    expect(JSON.stringify(response.body)).not.toContain("private-password");
  });

  it("rejects oversized JSON with 413", async () => {
    const response = await request(application.app).post("/users").send({ name: "x".repeat(103000) });
    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("rejects unsupported content type with 415", async () => {
    const response = await request(application.app).post("/users").type("form").send({ userId: "unparsed" });
    expect(response.status).toBe(415);
    expect(response.body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
  });

  it("rejects unsupported JSON charset with 415", async () => {
    const response = await request(application.app).post("/users").set("Content-Type", "application/json; charset=unknown").send('{}');
    expect(response.status).toBe(415);
    expect(response.body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
  });

  it.each([{ basePrice: "100" }, { itemId: null }, { publishedAt: "not a date" },
    { publishedAt: "2026-02-30T12:00:00Z" }, { closesAt: "2026-11-02" }])("rejects invalid publication format before persistence: %j", async (patch) => {
    const response = await request(application.app).post("/auctions").set("Authorization", `Bearer ${token}`)
      .send({ ...publication(), ...patch });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_REQUEST");
    const list = await request(application.app).get("/auctions");
    expect(list.body.items).toEqual([]);
  });

  it("RN-02 rejects a new auction whose closing date is already past despite historical publication dates", async () => {
    const response = await request(application.app).post("/auctions").set("Authorization", `Bearer ${token}`)
      .send({ ...publication(), auctionId: "expired-at-birth", publishedAt: "2026-01-01T00:00:00Z", closesAt: "2026-01-02T00:00:00Z" });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("BUSINESS_RULE_VIOLATION");
    const list = await request(application.app).get("/auctions");
    expect(list.body.items).toEqual([]);
  });

  it("keeps economic rules in domain and returns BUSINESS_RULE_VIOLATION", async () => {
    const response = await request(application.app).post("/auctions").set("Authorization", `Bearer ${token}`)
      .send({ ...publication(), basePrice: 0 });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("BUSINESS_RULE_VIOLATION");
  });

  it.each(["page=0", "page=1.5", "page=1e2", "page=1&page=2", "pageSize=9007199254740992", "status=UNKNOWN", "categoryId=", "page=9007199254740991&pageSize=10"])("rejects malformed query: %s", async (query) => {
    const response = await request(application.app).get(`/auctions?${query}`);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_REQUEST");
  });

  it("accepts valid filters and pagination", async () => {
    const response = await request(application.app).get("/auctions?status=OPEN&categoryId=category&page=1&pageSize=10");
    expect(response.status).toBe(200);
    expect(response.body.pagination).toMatchObject({ page: 1, pageSize: 10 });
  });

  it("validates bid format without recording a malformed attempt", async () => {
    expect((await request(application.app).post("/auctions").set("Authorization", `Bearer ${token}`).send(publication())).status).toBe(201);
    const response = await request(application.app).post("/auctions/validation-auction/bids")
      .set("Authorization", `Bearer ${token}`).send({ bidId: "bad", amount: "100", rejectedBidAttemptId: "bad-attempt" });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_REQUEST");
    const detail = await request(application.app).get("/auctions/validation-auction").set("Authorization", `Bearer ${token}`);
    expect(detail.body.bids).toEqual([]);
    expect(detail.body.rejectedBidAttempts).toEqual([]);
  });

  it("authenticates before validating protected operation bodies", async () => {
    const response = await request(application.app).post("/auctions").send({});
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("returns uniform 400 for invalid URL encoding", async () => {
    const response = await request(application.app).get("/auctions/%E0%A4%A");
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_REQUEST");
  });

  it("rejects an empty auction ID", async () => {
    const response = await request(application.app).get("/auctions/%20").set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_REQUEST");
  });

  it.each(["/does-not-exist", "/users/another-user"])("returns a uniform unknown-route response: %s", async (path) => {
    const response = await request(application.app).get(path);
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { code: "ROUTE_NOT_FOUND", message: "Route not found" } });
    expect(response.headers["content-type"]).toContain("application/json");
  });
});
