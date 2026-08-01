import { NextRequest, NextResponse } from "next/server";

export async function POST(_request: NextRequest) {
  return NextResponse.json({ message: "Deprecated endpoint. Use /api/roles/[id]/duplicate" }, { status: 410 });
}
