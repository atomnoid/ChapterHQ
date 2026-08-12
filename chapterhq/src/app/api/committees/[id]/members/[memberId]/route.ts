import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import {
  CommitteeMemberService,
  CommitteeNotFoundError,
  MemberNotFoundError,
  MemberNotInCommitteeError,
} from "@/services/committee-member.service";

import { isPresident, isCommitteeHead } from "@/lib/committee-auth";

const committeeMemberService = new CommitteeMemberService();

// DELETE /api/committees/[id]/members/[memberId]
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context: authContext } = await requirePermission(session.user.id, "committees:read");

    const { id: committeeId, memberId } = await context.params;
    const isPres = await isPresident(session.user.id, authContext.organizationId);
    const isHead = await isCommitteeHead(session.user.id, authContext.organizationId, committeeId);

    if (!isPres && !isHead) {
      return apiResponse.forbidden("You do not have access to manage this committee's members.");
    }

    await committeeMemberService.removeMemberFromCommittee(
      committeeId,
      memberId,
      authContext.organizationId,
      session.user.id
    );

    return apiResponse.success(null, "Member removed from committee successfully.");
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof CommitteeNotFoundError) {
      return apiResponse.notFound(error.message);
    }
    if (error instanceof MemberNotFoundError) {
      return apiResponse.notFound(error.message);
    }
    if (error instanceof MemberNotInCommitteeError) {
      return apiResponse.notFound(error.message);
    }
    return apiResponse.serverError();
  }
}
