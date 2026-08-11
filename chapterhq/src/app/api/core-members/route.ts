import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { CoreMemberService, CoreMemberAlreadyExistsError, CoreMemberNotFoundError } from "@/services/core-member.service";
import { apiResponse } from "@/lib/api-response";

const coreMemberService = new CoreMemberService();

const addCoreMemberSchema = z.object({
  memberId: z.string().trim().min(1, "Member ID is required."),
  note: z.string().trim().max(200, "Note must be 200 characters or less.").optional(),
});

// GET /api/core-members
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context } = await requirePermission(session.user.id, "members:read");

    const coreMembers = await coreMemberService.list(context.organizationId);

    return apiResponse.success(coreMembers);
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    return apiResponse.serverError();
  }
}

// POST /api/core-members
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context } = await requirePermission(session.user.id, "members:create");

    const body = await request.json();
    const validatedData = addCoreMemberSchema.parse(body);

    const record = await coreMemberService.add(
      context.organizationId,
      validatedData.memberId,
      validatedData.note,
      session.user.id
    );

    return apiResponse.created(record, "Core Member added successfully.");
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    if (error instanceof CoreMemberAlreadyExistsError) {
      return apiResponse.conflict(error.message);
    }
    return apiResponse.serverError();
  }
}
