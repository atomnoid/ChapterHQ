import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import {
  CommitteeMemberService,
  CommitteeNotFoundError,
} from "@/services/committee-member.service";
import {
  assignCommitteeMemberSchema,
  committeeMemberQuerySchema,
  removeCommitteeMembersSchema,
} from "@/validators/committee-member.validator";

import { isPresident, isCommitteeHead, isCommitteeMember } from "@/lib/committee-auth";

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

    const { id } = await context.params;
    const isPres = await isPresident(session.user.id, authContext.organizationId);
    const isCM = await isCommitteeMember(session.user.id, authContext.organizationId, id);

    if (!isPres && !isCM) {
      return apiResponse.forbidden("You do not have access to this committee's member list.");
    }

    const { searchParams } = new URL(request.url);
    const parsedQuery = committeeMemberQuerySchema.parse(
      Object.fromEntries(searchParams.entries())
    );

    const result = await committeeMemberService.listCommitteeMembers(
      id,
      authContext.organizationId,
      parsedQuery
    );

    return apiResponse.success(result);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") {
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

// POST /api/committees/[id]/members  – bulk assign
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context: authContext } = await requirePermission(session.user.id, "committees:read");

    const { id } = await context.params;
    const isPres = await isPresident(session.user.id, authContext.organizationId);
    const isHead = await isCommitteeHead(session.user.id, authContext.organizationId, id);

    if (!isPres && !isHead) {
      return apiResponse.forbidden("You do not have access to manage this committee's members.");
    }

    const body = await request.json();
    const { memberIds } = assignCommitteeMemberSchema.parse(body);

    const assignments = await committeeMemberService.assignMembersToCommittee(
      id,
      memberIds,
      authContext.organizationId,
      session.user.id
    );

    return apiResponse.created({ assignments }, "Members assigned to committee successfully.");
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") {
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

// DELETE /api/committees/[id]/members  – bulk remove
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context: authContext } = await requirePermission(session.user.id, "committees:read");

    const { id } = await context.params;
    const isPres = await isPresident(session.user.id, authContext.organizationId);
    const isHead = await isCommitteeHead(session.user.id, authContext.organizationId, id);

    if (!isPres && !isHead) {
      return apiResponse.forbidden("You do not have access to manage this committee's members.");
    }

    const body = await request.json();
    const { memberIds } = removeCommitteeMembersSchema.parse(body);

    await committeeMemberService.removeMembersFromCommittee(
      id,
      memberIds,
      authContext.organizationId,
      session.user.id
    );

    return apiResponse.success(null, "Members removed from committee successfully.");
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") {
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
