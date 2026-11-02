import type { Request, Response } from "express";

import type { RegisterUserUseCase } from "../../../application/use-cases/RegisterUserUseCase.js";

import type { GetUserProfileUseCase } from "../../../application/use-cases/GetUserProfileUseCase.js";
import { AuctionResponseMapper } from "../mappers/AuctionResponseMapper.js";

interface RegisterUserBody {
  userId: string;
  name: string;
  email: string;
  password: string;
}

export class UserController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly getUserProfileUseCase: GetUserProfileUseCase,
  ) {}

  profile = async (_request: Request, response: Response): Promise<void> => {
    const userId: unknown = response.locals.authenticatedUserId;
    if (typeof userId !== "string" || userId.length === 0) {
      throw new Error("Authenticated user ID is missing");
    }
    const profile = await this.getUserProfileUseCase.execute(userId);
    response.status(200).json({
      ...profile.user,
      publishedAuctions: profile.publishedAuctions.map(AuctionResponseMapper.toResponse),
      participatedAuctions: profile.participatedAuctions.map(AuctionResponseMapper.toResponse),
    });
  };

  register = async (
    request: Request<object, object, RegisterUserBody>,
    response: Response,
  ): Promise<void> => {
    const user = await this.registerUserUseCase.execute(request.body);

    console.log(`User registered: ${user.id.value}`);

    response.status(201).json({
      id: user.id.value,
      name: user.name,
      email: user.email.value,
    });
  };
}