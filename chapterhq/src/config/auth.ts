import type { AuthOptions } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

import { env } from "@/config";

const providers: AuthOptions["providers"] = [];

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
	providers.push(
			Google({
				clientId: env.GOOGLE_CLIENT_ID,
				clientSecret: env.GOOGLE_CLIENT_SECRET,
			})
	);
}

if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
	providers.push(
		GitHub({
			clientId: env.GITHUB_CLIENT_ID,
			clientSecret: env.GITHUB_CLIENT_SECRET,
		})
	);
}

export const authConfig = {
	secret: env.AUTH_SECRET,
	session: {
		strategy: "jwt",
	},
	providers,
	callbacks: {
		async jwt({ token, user, account }) {
			if (user) {
				token.id = user.id;
				token.name = user.name;
				token.email = user.email;
				token.picture = user.image;
			}

			if (account?.provider) {
				token.provider = account.provider;
			}

			return token;
		},
		async session({ session, token }) {
			if (session.user) {
				session.user.id = token.id ?? token.sub ?? "";
				session.user.name = token.name ?? session.user.name;
				session.user.email = token.email ?? session.user.email;
				session.user.image = token.picture ?? session.user.image;
			}

			return session;
		},
	},
} satisfies AuthOptions;
