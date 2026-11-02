import { requireJson } from "../middlewares/validateRequest.js";

import { Router } from "express";

import type { AuthController } from "../controllers/AuthController.js";

export function createAuthRouter(
  authController: AuthController,
): Router {
  const router = Router();

  router.post("/login", requireJson, authController.login);

  return router;
}
