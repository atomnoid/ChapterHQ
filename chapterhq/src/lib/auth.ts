import NextAuth, { getServerSession } from "next-auth";

import { authConfig } from "@/config/auth";

export const authOptions = authConfig;

export const auth = () => getServerSession(authOptions);

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
