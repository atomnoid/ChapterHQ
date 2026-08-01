import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import {
  CommitteeMemberService,
  CommitteeNotFoundError,
  MemberNotFoundError,
  MemberAlreadyInCommitteeError,
} from "@/services/committee-member.service";
import {
  assignCommitteeMemberSchema,
  committeeMemberQuerySchema,
} from "@/validators/committee-member.validator";

const committeeMemberService = new CommitteeMemberService();

// GET /api/committees/[id]/members
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context: authContext } = await requirePermission(session.user.id, "committees:read");

    const { searchParams } = new URL(request.url);
    const parsedQuery = committeeMemberQuerySchema.parse(
      Object.fromEntries(searchParams.entries())
    );

    const { id } = await context.params;
    const result = await committeeMemberService.listCommitteeMembers(
      id,
      authContext.organizationId,
      parsedQuery
    );

    return apiResponse.success(result);
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    if (error instanceof CommitteeNotFoundError) {
      return apiResponse.notFound(error.message);
    }
    return apiResponse.serverError();
  }
}

// POST /api/committees/[id]/members
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context: authContext } = await requirePermission(session.user.id, "committees:assign");

    const body = await request.json();
    const { memberId } = assignCommitteeMemberSchema.parse(body);

    const { id } = await context.params;
    const assignment = await committeeMemberService.assignMemberToCommittee(
      id,
      memberId,
      authContext.organizationId,
      session.user.id
    );

    return apiResponse.created(assignment, "Member assigned to committee successfully.");
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    if (error instanceof CommitteeNotFoundError) {
      return apiResponse.notFound(error.message);
    }
    if (error instanceof MemberNotFoundError) {
      return apiResponse.notFound(error.message);
    }
    if (error instanceof MemberAlreadyInCommitteeError) {
      return apiResponse.conflict(error.message);
    }
    return apiResponse.serverError();
  }
}
