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
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context } = await requirePermission(session.user.id, "committees:read");

    const { searchParams } = new URL(request.url);
    const parsedQuery = committeeMemberQuerySchema.parse(
      Object.fromEntries(searchParams.entries())
    );

    const resolvedParams = await params;
    const result = await committeeMemberService.listCommitteeMembers(
      resolvedParams.id,
      context.organizationId,
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
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context } = await requirePermission(session.user.id, "committees:assign");

    const body = await request.json();
    const { memberId } = assignCommitteeMemberSchema.parse(body);

    const resolvedParams = await params;
    const assignment = await committeeMemberService.assignMemberToCommittee(
      resolvedParams.id,
      memberId,
      context.organizationId,
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
