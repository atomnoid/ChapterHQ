// Import from project-local generated client (src/generated/) so Turbopack
// treats it as regular source code with correct `node` module conditions,
// instead of applying edge-light resolution to node_modules/@prisma/client.
import { PrismaClient } from "@/generated/prisma-client";

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.prisma ??
  new PrismaClient({
    log: ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}