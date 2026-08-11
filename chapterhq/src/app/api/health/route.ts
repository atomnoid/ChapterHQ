import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Prisma's MongoDB connector does not support SQL $queryRaw. A minimal
    // model query verifies the active database connection without relying on
    // a relational-only health check.
    await prisma.organization.count();

    return NextResponse.json(
      {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: "connected",
      },
      { status: 200 }
    );
  } catch (_error: unknown) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: "disconnected",
      },
      { status: 503 }
    );
  }
}
