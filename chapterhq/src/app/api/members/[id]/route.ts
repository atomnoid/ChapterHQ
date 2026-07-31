import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { MemberService, MemberNotFoundError } from "@/services/member.service";
import { updateMemberSchema } from "@/validators/member.validator";

const memberService = new MemberService();

// GET /api/members/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    // Resolve context & enforce permission
    const { context } = await requirePermission(session.user.id, "members:read");

    const resolvedParams = await params;
    const member = await memberService.getMember(resolvedParams.id, context.organizationId);

    return NextResponse.json(member, { status: 200 });
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") {
      return NextResponse.json({ message: "Permission denied." }, { status: 403 });
    }
    if (error instanceof MemberNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 444 || 404 }); // Standard 404 status code
    }
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}

// PUT /api/members/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    // Resolve context & enforce permission
    const { context } = await requirePermission(session.user.id, "members:update");

    const body = await request.json();
    const validatedData = updateMemberSchema.parse(body);

    const resolvedParams = await params;
    const updatedMember = await memberService.updateMember(
      resolvedParams.id,
      context.organizationId,
      validatedData
    );

    return NextResponse.json(
      { message: "Member updated successfully.", data: updatedMember },
      { status: 200 }
    );
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
    if (error instanceof MemberNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}

// DELETE /api/members/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    // Resolve context & enforce permission
    const { context } = await requirePermission(session.user.id, "members:delete");

    const resolvedParams = await params;
    await memberService.deleteMember(resolvedParams.id, context.organizationId);

    return NextResponse.json({ message: "Member deleted successfully." }, { status: 200 });
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") {
      return NextResponse.json({ message: "Permission denied." }, { status: 403 });
    }
    if (error instanceof MemberNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
