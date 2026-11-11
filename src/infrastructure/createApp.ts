import { WebSocketAuctionEventPublisher } from "./realtime/WebSocketAuctionEventPublisher.js";
import { GetPaymentOrderUseCase } from "../application/use-cases/GetPaymentOrderUseCase.js";
import { PaymentOrderController } from "./http/controllers/PaymentOrderController.js";
import { createPaymentOrderRouter } from "./http/routes/paymentOrderRoutes.js";
import { GetUserProfileUseCase } from "../application/use-cases/GetUserProfileUseCase.js";
import express from "express";
import { fileURLToPath } from "node:url";

import { PublishAuctionUseCase } from "../application/use-cases/PublishAuctionUseCase.js";
import { EditAuctionUseCase } from "../application/use-cases/EditAuctionUseCase.js";
import { ProcessPaymentEventUseCase } from "../application/use-cases/ProcessPaymentEventUseCase.js";
import { SqlitePaymentEventStore } from "./persistence/sqlite/SqlitePaymentEventStore.js";
import { createPaymentWebhookRouter } from "./http/routes/paymentWebhookRoutes.js";
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
import { createPasswordResetRouter } from "./http/routes/passwordResetRoutes.js";

import { createAuthenticate } from "./http/middlewares/authenticate.js";

export function createApp(databasePath = process.env.DATABASE_PATH ?? "./data/auctions.sqlite") {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) throw new Error("JWT_SECRET environment variable is required");
  const jwtExpiresInSeconds = Number(process.env.JWT_EXPIRES_IN_SECONDS ?? "3600");
  const tokenService = new JwtTokenService(jwtSecret, jwtExpiresInSeconds);
  const database = openDatabase(databasePath);
  const app = express();

  app.use("/payments", createPaymentWebhookRouter(
    new ProcessPaymentEventUseCase(new SqlitePaymentEventStore(database)),
    process.env.PAYMENT_WEBHOOK_SECRET,
  ));
  const json = express.json({ limit: "100kb" });
  const publicationJson = express.json({ limit: "3mb" });
  app.use((request, response, next) => {
    const acceptsPhoto = (request.method === "POST" && /^\/auctions\/?$/i.test(request.path))
      || (request.method === "PATCH" && /^\/auctions\/[^/]+\/?$/i.test(request.path));
    const parse = acceptsPhoto
      ? publicationJson
      : json;
    parse(request, response, next);
  });
  app.use("/web", express.static(fileURLToPath(new URL("../../web/", import.meta.url))));

  const auctionRepository = new SqliteAuctionRepository(database);
  app.get("/auctions/:auctionId/photo", (request, response) => {
    response.set("Cache-Control", "no-cache");
    const photo = auctionRepository.findPhoto(request.params.auctionId);
    if (typeof photo?.photo_type !== "string" || !(photo.photo_bytes instanceof Uint8Array)) {
      response.sendStatus(404);
      return;
    }
    response.set("X-Content-Type-Options", "nosniff");
    response.type(photo.photo_type).send(Buffer.from(photo.photo_bytes));
  });
  const idGenerator = new RandomIdGenerator();
  const userRepository = new SqliteUserRepository(database);
  const realtime = new WebSocketAuctionEventPublisher(tokenService, userRepository, auctionRepository);
  const passwordHasher = new ScryptPasswordHasher();

  const publishAuctionUseCase = new PublishAuctionUseCase(auctionRepository);

  const getAuctionUseCase = new GetAuctionUseCase(auctionRepository, idGenerator, realtime);

  const listAuctionsUseCase = new ListAuctionsUseCase(auctionRepository);

  const cancelAuctionUseCase = new CancelAuctionUseCase(auctionRepository);

  const placeBidUseCase = new PlaceBidUseCase(auctionRepository, idGenerator, realtime);

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
    new EditAuctionUseCase(auctionRepository),
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
  app.use("/auth", createPasswordResetRouter(database, passwordHasher));

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

  app.use((_request, response) => {
    response.status(404).json({ error: { code: "ROUTE_NOT_FOUND", message: "Route not found" } });
  });
  app.use(errorHandler);

  return { app, realtime, close: () => database.close() };
}
