
import { Router } from "express";

import type { AuthController } from "../controllers/AuthController.js";

export function createAuthRouter(
  authController: AuthController,
): Router {
  const router = Router();

  router.post("/login", authController.login);

  return router;
}
