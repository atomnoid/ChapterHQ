import { NextRequest, NextResponse } from "next/server";

export async function DELETE(_request: NextRequest) {
  return NextResponse.json({ message: "Deprecated endpoint. Use /api/members/[id]/roles/[roleId]" }, { status: 410 });
}
