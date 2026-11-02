import { GetPaymentOrderUseCase } from "../application/use-cases/GetPaymentOrderUseCase.js";
import { PaymentOrderController } from "./http/controllers/PaymentOrderController.js";
import { createPaymentOrderRouter } from "./http/routes/paymentOrderRoutes.js";
import { GetUserProfileUseCase } from "../application/use-cases/GetUserProfileUseCase.js";
import express from "express";

import { PublishAuctionUseCase } from "../application/use-cases/PublishAuctionUseCase.js";
import { GetAuctionUseCase } from "../application/use-cases/GetAuctionUseCase.js";
import { ListAuctionsUseCase } from "../application/use-cases/ListAuctionsUseCase.js";
import { CancelAuctionUseCase } from "../application/use-cases/CancelAuctionUseCase.js";
import { PlaceBidUseCase } from "../application/use-cases/PlaceBidUseCase.js";

import { SqliteAuctionRepository } from "./persistence/sqlite/SqliteAuctionRepository.js";
import { SqliteUserRepository } from "./persistence/sqlite/SqliteUserRepository.js";
import { openDatabase } from "./persistence/sqlite/SqliteDatabase.js";
import { AuctionController } from "./http/controllers/AuctionController.js";
import { createAuctionRouter } from "./http/routes/auctionRoutes.js";
import { errorHandler } from "./http/middlewares/errorHandler.js";
import { RandomIdGenerator } from "./id/RandomIdGenerator.js";

import { RegisterUserUseCase } from "../application/use-cases/RegisterUserUseCase.js";
import { ScryptPasswordHasher } from "./security/ScryptPasswordHasher.js";
import { UserController } from "./http/controllers/UserController.js";
import { createUserRouter } from "./http/routes/userRoutes.js";
import "dotenv/config";
import { LoginUserUseCase } from "../application/use-cases/LoginUserUseCase.js";
import { JwtTokenService } from "./security/JwtTokenService.js";
import { AuthController } from "./http/controllers/AuthController.js";
import { createAuthRouter } from "./http/routes/authRoutes.js";

import { createAuthenticate } from "./http/middlewares/authenticate.js";

export function createApp(databasePath = process.env.DATABASE_PATH ?? "./data/auctions.sqlite") {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) throw new Error("JWT_SECRET environment variable is required");
  const jwtExpiresInSeconds = Number(process.env.JWT_EXPIRES_IN_SECONDS ?? "3600");
  const tokenService = new JwtTokenService(jwtSecret, jwtExpiresInSeconds);
  const database = openDatabase(databasePath);
  const app = express();

  app.use(express.json());

  const auctionRepository = new SqliteAuctionRepository(database);
  const idGenerator = new RandomIdGenerator();
  const userRepository = new SqliteUserRepository(database);
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
    new GetUserProfileUseCase(userRepository, auctionRepository),
  );

  const auctionController = new AuctionController(
    publishAuctionUseCase,
    getAuctionUseCase,
    listAuctionsUseCase,
    cancelAuctionUseCase,
    placeBidUseCase,
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

  const authenticate = createAuthenticate(tokenService, userRepository,);

  app.use("/auth", createAuthRouter(authController));

  app.use(
    "/users",
    createUserRouter(userController, authenticate),
  );

  app.use(
    "/auctions",
    createAuctionRouter(auctionController, authenticate),
  );

  app.use(
    "/auctions",
    createPaymentOrderRouter(
      new PaymentOrderController(new GetPaymentOrderUseCase(auctionRepository)),
      authenticate,
    ),
  );

  app.use(errorHandler);

  return { app, close: () => database.close() };
}