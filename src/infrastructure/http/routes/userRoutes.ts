import { requireJson, validateUserRegistration } from "../middlewares/validateRequest.js";
import type { RequestHandler } from "express";
import { Router } from "express";

import type { UserController } from "../controllers/UserController.js";

export function createUserRouter(
  userController: UserController,
  authenticate: RequestHandler,
): Router {
  const router = Router();

  router.get("/me", authenticate, userController.profile);

  router.post("/", requireJson, validateUserRegistration, userController.register);

  return router;
}