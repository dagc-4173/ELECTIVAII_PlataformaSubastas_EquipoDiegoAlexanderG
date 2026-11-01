

export class ForbiddenOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenOperationError";
  }
}

