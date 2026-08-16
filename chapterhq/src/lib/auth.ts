import { getServerSession } from "next-auth";

import { authConfig } from "@/config/auth";

export const authOptions = authConfig;

export const auth = () => getServerSession(authOptions);
