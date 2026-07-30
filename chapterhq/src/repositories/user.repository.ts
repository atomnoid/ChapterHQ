import { prisma } from "@/lib/prisma";

interface CreateUserData {
  name: string;
  email: string;
  password: string;
  authProvider: string;
}

interface CreateOAuthUserData {
  name: string;
  email: string;
  image: string | null;
  authProvider: string;
}

export class UserRepository {
 async findByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  console.log("Searching:", normalizedEmail);

  const user1 = await prisma.user.findFirst({
    where: {
      email: normalizedEmail,
    },
  });

  console.log("WITHOUT deletedAt:", user1);

  const user2 = await prisma.user.findFirst({
    where: {
      email: normalizedEmail,
      deletedAt: null,
    },
  });

  console.log("WITH deletedAt:", user2);

  return user1;
}
  async createCredentialsUser(data: CreateUserData) {
    return prisma.user.create({
      data,
    });
  }

  async createOAuthUser(data: CreateOAuthUserData) {
    return prisma.user.create({
      data,
    });
  }

  async updateOAuthProfile(
    userId: string,
    data: {
      name: string;
      image: string | null;
      authProvider: string;
    }
  ) {
    return prisma.user.update({
      where: {
        id: userId,
      },
      data,
    });
  }

  async updateLastLogin(userId: string) {
    return prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        lastLogin: new Date(),
      },
    });
  }

  async setPasswordResetToken(
    userId: string,
    resetTokenHash: string,
    expiresAt: Date
  ) {
    return prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        passwordResetToken: resetTokenHash,
        passwordResetTokenExpiry: expiresAt,
      },
    });
  }

  async clearPasswordResetToken(userId: string) {
    return prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        passwordResetToken: null,
        passwordResetTokenExpiry: null,
      },
    });
  }
}