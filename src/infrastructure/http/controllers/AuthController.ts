
import type { Request, Response } from "express";

import type { LoginUserUseCase } from "../../../application/use-cases/LoginUserUseCase.js";
import type { TokenService } from "../../../application/ports/TokenService.js";

export class AuthController {
  constructor(
    private readonly loginUserUseCase: LoginUserUseCase,
    private readonly tokenService: TokenService,
    private readonly expiresInSeconds: number,
  ) {}

  login = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    const body: unknown = request.body;

    if (
      typeof body !== "object" ||
      body === null ||
      !("email" in body) ||
      typeof body.email !== "string" ||
      !("password" in body) ||
      typeof body.password !== "string" ||
      body.email.trim().length === 0 ||
      body.password.length === 0
    ) {
      response.status(400).json({
        error: {
          code: "INVALID_REQUEST",
          message: "Email and password are required",
        },
      });
      return;
    }

    const user = await this.loginUserUseCase.execute({
      email: body.email,
      password: body.password,
    });

    const accessToken = this.tokenService.generate(
      user.id.value,
    );

    response.status(200).json({
      accessToken,
      tokenType: "Bearer",
      expiresIn: this.expiresInSeconds,
    });
  };
}
