import { createHash, randomBytes } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { Router } from "express";
import type { PasswordHasher } from "../../../application/ports/PasswordHasher.js";
import { ApiError } from "../errors/ApiError.js";
import { requireJson, validateBody } from "../middlewares/validateRequest.js";

const lifetime = 15 * 60 * 1000;
const cooldown = 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createDelivery() {
  const mode = process.env.PASSWORD_RESET_MODE;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.PASSWORD_RESET_FROM;
  const base = process.env.PASSWORD_RESET_URL;
  if (mode === "local") {
    const page = new URL(base || `http://localhost:${process.env.PORT ?? 3000}/web/`);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(page.hostname)) {
      throw new Error("Local password recovery requires a loopback URL");
    }
    return async (_email: string, token: string) => {
      const link = new URL(page);
      link.hash = `reset=${token}`;
      console.log(`[Recuperación local] ${link.href}`);
    };
  }
  if (mode !== "email") return undefined;
  if (!apiKey || !from || !base || new URL(base).protocol !== "https:") {
    throw new Error("Email password recovery requires RESEND_API_KEY, PASSWORD_RESET_FROM and an HTTPS PASSWORD_RESET_URL");
  }
  return async (email: string, token: string) => {
    const link = new URL(base);
    link.hash = `reset=${token}`;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "Restablece tu contraseña de Plataforma de Subastas",
        text: `Abre este enlace para elegir una nueva contraseña. Caduca en 15 minutos.\n\n${link.href}\n\nSi no solicitaste el cambio, puedes ignorar este mensaje.`,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("Password recovery email delivery failed");
  };
}

export function createPasswordResetRouter(db: DatabaseSync, passwords: PasswordHasher) {
  const router = Router();
  const deliver = createDelivery();

  router.post("/password-reset/request", requireJson, validateBody({ email: "string" }), (request, response) => {
    if (!deliver) throw new ApiError(503, "RECOVERY_UNAVAILABLE", "Password recovery is unavailable");
    const email = (request.body.email as string).trim().toLowerCase();
    const token = randomBytes(32).toString("hex");
    const hash = hashToken(token);
    const expiresAt = Date.now() + lifetime;
    const issued = db.prepare(`
      INSERT INTO password_resets (user_id, token_hash, expires_at)
      SELECT id, ?, ? FROM users WHERE email = ?
      ON CONFLICT(user_id) DO UPDATE SET token_hash = excluded.token_hash, expires_at = excluded.expires_at
      WHERE password_resets.expires_at <= excluded.expires_at - ?
    `).run(hash, expiresAt, email, cooldown);
    if (issued.changes) {
      void deliver(email, token).catch(() => {
        try {
          db.prepare("DELETE FROM password_resets WHERE token_hash = ?").run(hash);
        } catch {
          // The database may have closed while delivery was in flight.
        }
        console.error("Password recovery delivery failed.");
      });
    }
    response.status(202).end();
  });

  router.post("/password-reset/confirm", requireJson, validateBody({ token: "string", password: "string" }), async (request, response) => {
    const { token, password } = request.body as { token: string; password: string };
    if (password.length < 8 || password.length > 128 || !password.trim()) {
      throw new ApiError(400, "INVALID_PASSWORD", "Password must contain 8 to 128 characters");
    }
    const invalidToken = new ApiError(400, "INVALID_RESET_TOKEN", "Password reset token is invalid or expired");
    if (!/^[a-f0-9]{64}$/.test(token)) throw invalidToken;
    const hash = hashToken(token);
    const find = db.prepare("SELECT user_id FROM password_resets WHERE token_hash = ? AND expires_at > ?");
    if (!find.get(hash, Date.now())) throw invalidToken;
    const passwordHash = await passwords.hash(password);

    db.exec("BEGIN IMMEDIATE");
    try {
      const row = find.get(hash, Date.now());
      if (typeof row?.user_id !== "string") throw invalidToken;
      db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, row.user_id);
      db.prepare("DELETE FROM password_resets WHERE token_hash = ?").run(hash);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    response.status(204).end();
  });

  return router;
}
