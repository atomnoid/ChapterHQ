import type { AuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

import { env } from "@/config";
import { MemberRepository } from "@/repositories/member.repository";
import {
  AuthAccountDisabledError,
  AuthInvalidCredentialsError,
  AuthService,
} from "@/services/auth.service";
import { loginSchema } from "@/validators/auth.validator";

const providers: AuthOptions["providers"] = [];
const authService = new AuthService();
const memberRepository = new MemberRepository();

providers.push(
  Credentials({
    name: "Credentials",
    credentials: {
      email: {
        label: "Email",
        type: "email",
      },
      password: {
        label: "Password",
        type: "password",
      },
    },
    async authorize(credentials) {
      const parsedCredentials = loginSchema.safeParse(credentials);

      if (!parsedCredentials.success) {
        return null;
      }

      try {
        const user = await authService.authenticateCredentials(
          parsedCredentials.data,
        );

        console.log("AUTHORIZE USER ID:", user.id);
        console.log("AUTHORIZE USER:", JSON.stringify(user, null, 2));

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      } catch (error) {
        if (
          error instanceof AuthInvalidCredentialsError ||
          error instanceof AuthAccountDisabledError
        ) {
          return null;
        }

        throw error;
      }
    },
  }),
);

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
  providers.push(
    GitHub({
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    }),
  );
}

export const authConfig = {
  secret: env.AUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (!account || account.provider === "credentials") {
        return true;
      }

      if (!user.email) {
        return false;
      }

      await authService.ensureOAuthUser({
        email: user.email,
        name: user.name ?? "",
        image: user.image ?? null,
        provider: account.provider,
      });

      return true;
    },
    async jwt({ token, user, account, trigger, session }) {
      if (account?.provider && token.email && !token.id) {
        const existingUser = await authService.getUserByEmail(token.email);

        if (existingUser) {
          token.id = existingUser.id;
          token.name = existingUser.name;
          token.email = existingUser.email;
          token.picture = existingUser.image;
        }
      }

      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
      }

      if (account?.provider) {
        token.provider = account.provider;
      }

      if (trigger === "update" && token.id && session?.activeOrganizationId) {
        const membership = await memberRepository.findActiveByUserId(
          token.id,
          session.activeOrganizationId
        );

        if (membership) {
          token.activeOrganizationId = membership.organizationId;
        }
      }

      if (token.id && !token.activeOrganizationId) {
        try {
          console.log("TOKEN ID:", token.id);

          // Raw bypass — no filters except userId — to see what actually exists in DB
          const { prisma } = await import("@/lib/prisma");
          const rawMembers = await prisma.member.findMany({
            where: { userId: token.id },
            select: { id: true, userId: true, organizationId: true, status: true, deletedAt: true },
          });
          console.log("RAW MEMBERS (no filter):", JSON.stringify(rawMembers));

          const memberships = await memberRepository.listByUser(token.id);
          console.log("MEMBERSHIPS:", JSON.stringify(memberships.map(m => ({ id: m.id, orgId: m.organizationId, status: m.status }))));

          const activeMembership = memberships[0];

          if (activeMembership) {
            token.activeOrganizationId = activeMembership.organizationId;
            console.log("[auth/jwt] activeOrganizationId SET:", token.activeOrganizationId);
          } else {
            console.warn("[auth/jwt] listByUser returned empty for userId:", token.id);
          }
        } catch (err) {
          console.error("[auth/jwt] ERROR in membership lookup:", err);
        }
      }

      // We also check trigger / custom token updates to allow runtime organization switching.
      // NextAuth passes the updated token directly.
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? token.sub ?? "";
        session.user.name = token.name ?? session.user.name;
        session.user.email = token.email ?? session.user.email;
        session.user.image = token.picture ?? session.user.image;
      }
      session.activeOrganizationId = token.activeOrganizationId;
      console.log("[auth/session] userId:", session.user?.id, "activeOrganizationId:", session.activeOrganizationId);

      return session;
    },
  },
} satisfies AuthOptions;
