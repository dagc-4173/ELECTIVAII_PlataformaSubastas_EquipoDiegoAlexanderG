import type { Request, Response } from "express";

import type { RegisterUserUseCase } from "../../../application/use-cases/RegisterUserUseCase.js";

interface RegisterUserBody {
  userId: string;
  name: string;
  email: string;
  password: string;
}

export class UserController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
  ) {}

  register = async (
    request: Request<object, object, RegisterUserBody>,
    response: Response,
  ): Promise<void> => {
    const user = await this.registerUserUseCase.execute(request.body);

    response.status(201).json({
      id: user.id.value,
      name: user.name,
      email: user.email.value,
    });
  };
}