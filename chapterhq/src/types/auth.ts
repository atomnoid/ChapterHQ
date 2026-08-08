import type { DefaultSession } from "next-auth";

declare module "next-auth" {
	interface Session {
		user: DefaultSession["user"] & {
			id: string;
		};
		activeOrganizationId?: string;
		activeCommitteeId?: string | null;
	}

	interface User {
		id: string;
	}
}

declare module "next-auth/jwt" {
	interface JWT {
		id?: string;
		provider?: string;
		activeOrganizationId?: string;
		activeCommitteeId?: string | null;
	}
}

export interface AuthSessionUser {
	id: string;
	name: string | null;
	email: string | null;
	image: string | null;
}
