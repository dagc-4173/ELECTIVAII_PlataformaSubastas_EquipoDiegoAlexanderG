import type { AuctionRepository } from "../../domain/ports/AuctionRepository.js";
import type { UserRepository } from "../../domain/ports/UserRepository.js";
import { UserId } from "../../domain/value-objects/UserId.js";
import { NotFoundError } from "../errors/NotFoundError.js";

export class GetUserProfileUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auctionRepository: AuctionRepository,
  ) {}

  async execute(authenticatedUserId: string) {
    const userId = UserId.create(authenticatedUserId);
    const user = await this.userRepository.findById(userId);
    if (user === null) throw new NotFoundError("User not found");

    const auctions = await this.auctionRepository.findAll();
    return {
      user: { id: user.id.value, name: user.name, email: user.email.value },
      publishedAuctions: auctions.filter((auction) => auction.seller.equals(userId)),
      participatedAuctions: auctions.filter((auction) =>
        auction.bidHistory.some((bid) => bid.bidder.equals(userId)),
      ),
    };
  }
}
