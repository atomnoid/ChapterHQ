import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";

import { UserRepository } from "@/repositories/user.repository";
import {
  forgotPasswordSchema,
  loginSchema,
  signupSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type SignupInput,
} from "@/validators/auth.validator";

const PASSWORD_HASH_PREFIX = "scrypt";
const PASSWORD_SALT_BYTES = 16;
const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_RESET_TTL_MINUTES = 20;

export class AuthEmailAlreadyExistsError extends Error {
  constructor() {
    super("An account with this email already exists.");
    this.name = "AuthEmailAlreadyExistsError";
  }
}

export class AuthInvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password.");
    this.name = "AuthInvalidCredentialsError";
  }
}

export class AuthAccountDisabledError extends Error {
  constructor() {
    super("This account is not active.");
    this.name = "AuthAccountDisabledError";
  }
}

interface OAuthProfile {
  email: string;
  name: string;
  image: string | null;
  provider: string;
}

interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  authProvider: string;
}

export class AuthService {
  constructor(private readonly userRepository = new UserRepository()) {}

  async signup(input: SignupInput) {
    const data = signupSchema.parse(input);

    const existingUser = await this.userRepository.findByEmail(data.email);

    if (existingUser) {
      throw new AuthEmailAlreadyExistsError();
    }

    const hashedPassword = this.hashPassword(data.password);

    return this.userRepository.createCredentialsUser({
      name: data.name,
      email: data.email.trim().toLowerCase(),
      password: hashedPassword,
      authProvider: "credentials",
    });
  }

  async authenticateCredentials(input: LoginInput): Promise<AuthenticatedUser> {
    const data = loginSchema.parse({
      ...input,
      email: input.email.trim().toLowerCase(),
    });

    const user = await this.userRepository.findByEmail(data.email);

    console.log("========== LOGIN DEBUG ==========");
    console.log("Input Email:", data.email);
    console.log("User Found:", !!user);
    console.log("User:", user);
    console.log("Stored Password:", user?.password);
    console.log("Stored Status:", user?.status);

    if (!user || !user.password) {
      throw new AuthInvalidCredentialsError();
    }

    if (user.status !== "ACTIVE") {
      throw new AuthAccountDisabledError();
    }

    const isValidPassword = this.verifyPassword(data.password, user.password);

    if (!isValidPassword) {
      throw new AuthInvalidCredentialsError();
    }

    await this.userRepository.updateLastLogin(user.id);

    return {
      id: user.id,
      name: user.name ?? "",
      email: user.email,
      image: user.image,
      authProvider: user.authProvider,
    };
  }

  async ensureOAuthUser(input: OAuthProfile) {
    const existingUser = await this.userRepository.findByEmail(input.email);

    if (!existingUser) {
      return this.userRepository.createOAuthUser({
        name: input.name,
        email: input.email,
        image: input.image,
        authProvider: input.provider,
      });
    }

    if (existingUser.status !== "ACTIVE") {
      throw new AuthAccountDisabledError();
    }

    await this.userRepository.updateOAuthProfile(existingUser.id, {
      name: input.name,
      image: input.image,
      authProvider: input.provider,
    });

    await this.userRepository.updateLastLogin(existingUser.id);

    return existingUser;
  }

  async preparePasswordReset(input: ForgotPasswordInput) {
    const data = forgotPasswordSchema.parse(input);

    const user = await this.userRepository.findByEmail(data.email);

    if (!user) {
      return {
        accepted: true,
      };
    }

    const rawToken = randomBytes(32).toString("hex");
    const hashedToken = this.hashResetToken(rawToken);

    const expiresAt = new Date(
      Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000,
    );

    await this.userRepository.setPasswordResetToken(
      user.id,
      hashedToken,
      expiresAt,
    );

    return {
      accepted: true,
      expiresAt,
    };
  }

  async getUserByEmail(email: string) {
    return this.userRepository.findByEmail(email.trim().toLowerCase());
  }

  private hashPassword(password: string) {
    const salt = randomBytes(PASSWORD_SALT_BYTES).toString("hex");
    const derivedKey = scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString(
      "hex",
    );

    return `${PASSWORD_HASH_PREFIX}$${salt}$${derivedKey}`;
  }

  private verifyPassword(password: string, storedHash: string) {
    const [prefix, salt, hash] = storedHash.split("$");

    if (prefix !== PASSWORD_HASH_PREFIX || !salt || !hash) {
      return false;
    }

    const derivedKey = scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString(
      "hex",
    );

    const hashBuffer = Buffer.from(hash, "hex");
    const derivedKeyBuffer = Buffer.from(derivedKey, "hex");

    if (hashBuffer.length !== derivedKeyBuffer.length) {
      return false;
    }

    return timingSafeEqual(hashBuffer, derivedKeyBuffer);
  }

  private hashResetToken(rawToken: string) {
    return createHash("sha256").update(rawToken).digest("hex");
  }
}
