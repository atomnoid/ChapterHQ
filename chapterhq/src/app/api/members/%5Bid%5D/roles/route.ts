import { NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest) {
  return NextResponse.json({ message: "Deprecated endpoint. Use /api/members/[id]/roles" }, { status: 410 });
}

export async function POST(_request: NextRequest) {
  return NextResponse.json({ message: "Deprecated endpoint. Use /api/members/[id]/roles" }, { status: 410 });
}
