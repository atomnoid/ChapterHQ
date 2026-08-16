import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { CustomFormSubmissionService } from "@/services/custom-form-submission.service";

const submissionService = new CustomFormSubmissionService();

/**
 * GET /api/forms/[id]/submissions/[submissionId]
 * Get a single submission
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string; submissionId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { context } = await requirePermission(session.user.id, "forms-submissions:read");

    const submission = await submissionService.getSubmission(
      context.organizationId,
      params.id,
      params.submissionId
    );

    return NextResponse.json(submission, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") {
      return NextResponse.json({ message: "Permission denied." }, { status: 403 });
    }
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    console.error("GET /api/forms/[id]/submissions/[submissionId] error:", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
