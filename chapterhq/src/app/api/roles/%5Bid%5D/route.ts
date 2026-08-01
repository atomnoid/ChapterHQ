import { NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest) {
  return NextResponse.json({ message: "Deprecated endpoint. Use /api/roles/[id]" }, { status: 410 });
}

export async function PATCH(_request: NextRequest) {
  return NextResponse.json({ message: "Deprecated endpoint. Use /api/roles/[id]" }, { status: 410 });
}

export async function DELETE(_request: NextRequest) {
  return NextResponse.json({ message: "Deprecated endpoint. Use /api/roles/[id]" }, { status: 410 });
}
