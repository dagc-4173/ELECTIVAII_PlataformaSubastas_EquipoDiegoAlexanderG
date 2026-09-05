import { Router } from "express";

import type { UserController } from "../controllers/UserController.js";

export function createUserRouter(
  userController: UserController,
): Router {
  const router = Router();

  router.post("/", userController.register);

  return router;
}