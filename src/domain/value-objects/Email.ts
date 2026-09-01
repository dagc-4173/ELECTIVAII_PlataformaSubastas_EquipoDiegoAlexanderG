export class Email {
  private constructor(private readonly address: string) {}

  static create(address: string): Email {
    const normalizedAddress = address.trim().toLowerCase();

    if (normalizedAddress.length === 0) {
      throw new Error("Email address cannot be empty");
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalizedAddress)) {
      throw new Error("Email address is invalid");
    }

    return new Email(normalizedAddress);
  }

  get value(): string {
    return this.address;
  }

  equals(other: Email): boolean {
    return this.address === other.address;
  }
}