
export interface TokenService {
  generate(userId: string): string;

  verify(token: string): string | null;
}
