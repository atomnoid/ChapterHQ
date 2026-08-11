import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { MemberService, MemberNotFoundError } from "@/services/member.service";
import { memberQuerySchema } from "@/validators/member.validator";
import { parsePaginationQuery } from "@/lib/pagination";

const memberService = new MemberService();

// GET /api/members
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    // 1. Resolve context and enforce 'members:read' permission
    const { context } = await requirePermission(session.user.id, "members:read");

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);
    const parsedQuery = memberQuerySchema.parse(Object.fromEntries(searchParams.entries()));

    // 3. Retrieve list
    const result = await memberService.getMembers({
      ...parsedQuery,
      organizationId: context.organizationId,
      activeCommitteeId: context.activeCommitteeId,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") {
      return NextResponse.json({ message: "Permission denied." }, { status: 403 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Invalid request." },
        { status: 400 }
      );
    }
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
