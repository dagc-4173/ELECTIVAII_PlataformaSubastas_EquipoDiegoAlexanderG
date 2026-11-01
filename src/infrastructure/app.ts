import express from "express";

import { PublishAuctionUseCase } from "../application/use-cases/PublishAuctionUseCase.js";
import { GetAuctionUseCase } from "../application/use-cases/GetAuctionUseCase.js";
import { ListAuctionsUseCase } from "../application/use-cases/ListAuctionsUseCase.js";
import { CancelAuctionUseCase } from "../application/use-cases/CancelAuctionUseCase.js";
import { PlaceBidUseCase } from "../application/use-cases/PlaceBidUseCase.js";

import { InMemoryAuctionRepository } from "./persistence/memory/InMemoryAuctionRepository.js";
import { AuctionController } from "./http/controllers/AuctionController.js";
import { createAuctionRouter } from "./http/routes/auctionRoutes.js";
import { errorHandler } from "./http/middlewares/errorHandler.js";
import { RandomIdGenerator } from "./id/RandomIdGenerator.js";

import { RegisterUserUseCase } from "../application/use-cases/RegisterUserUseCase.js";
import { InMemoryUserRepository } from "./persistence/memory/InMemoryUserRepository.js";
import { ScryptPasswordHasher } from "./security/ScryptPasswordHasher.js";
import { UserController } from "./http/controllers/UserController.js";
import { createUserRouter } from "./http/routes/userRoutes.js";
import "dotenv/config";
import { LoginUserUseCase } from "../application/use-cases/LoginUserUseCase.js";
import { JwtTokenService } from "./security/JwtTokenService.js";
import { AuthController } from "./http/controllers/AuthController.js";
import { createAuthRouter } from "./http/routes/authRoutes.js";

import { createAuthenticate } from "./http/middlewares/authenticate.js";

const app = express();

app.use(express.json());



const auctionRepository = new InMemoryAuctionRepository();
const idGenerator = new RandomIdGenerator();
const userRepository = new InMemoryUserRepository();
const passwordHasher = new ScryptPasswordHasher();

const publishAuctionUseCase = new PublishAuctionUseCase(auctionRepository);

const getAuctionUseCase = new GetAuctionUseCase(auctionRepository, idGenerator);

const listAuctionsUseCase = new ListAuctionsUseCase(auctionRepository);

const cancelAuctionUseCase = new CancelAuctionUseCase(auctionRepository);

const placeBidUseCase = new PlaceBidUseCase(auctionRepository, idGenerator);

const registerUserUseCase = new RegisterUserUseCase(
  userRepository,
  passwordHasher,
);

const userController = new UserController(
  registerUserUseCase,
);

const auctionController = new AuctionController(
  publishAuctionUseCase,
  getAuctionUseCase,
  listAuctionsUseCase,
  cancelAuctionUseCase,
  placeBidUseCase,
);

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error("JWT_SECRET environment variable is required");
}

const jwtExpiresInSeconds = Number(
  process.env.JWT_EXPIRES_IN_SECONDS ?? "3600",
);

const tokenService = new JwtTokenService(
  jwtSecret,
  jwtExpiresInSeconds,
);

const loginUserUseCase = new LoginUserUseCase(
  userRepository,
  passwordHasher,
);

const authController = new AuthController(
  loginUserUseCase,
  tokenService,
  jwtExpiresInSeconds,
);

const authenticate = createAuthenticate(tokenService);

app.use("/auth", createAuthRouter(authController));

app.use(
  "/users",
  createUserRouter(userController),
);

app.use(
  "/auctions",
  createAuctionRouter(auctionController, authenticate),
);

app.use(errorHandler);

export { app };