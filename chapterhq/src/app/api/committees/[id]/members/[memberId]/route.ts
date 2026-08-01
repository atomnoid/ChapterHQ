import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import {
  CommitteeMemberService,
  CommitteeNotFoundError,
  MemberNotFoundError,
  MemberNotInCommitteeError,
} from "@/services/committee-member.service";

const committeeMemberService = new CommitteeMemberService();

// DELETE /api/committees/[id]/members/[memberId]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context } = await requirePermission(session.user.id, "committees:remove");

    const { id: committeeId, memberId } = await params;

    await committeeMemberService.removeMemberFromCommittee(
      committeeId,
      memberId,
      context.organizationId,
      session.user.id
    );

    return apiResponse.success(null, "Member removed from committee successfully.");
  } catch (error: any) {
    if (error.name === "PermissionDeniedError") {
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
