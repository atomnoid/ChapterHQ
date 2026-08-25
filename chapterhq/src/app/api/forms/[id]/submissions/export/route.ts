import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { CustomFormSubmissionService } from "@/services/custom-form-submission.service";

const submissionService = new CustomFormSubmissionService();

/**
 * POST /api/forms/[id]/submissions/export
 * Export form submissions as a CSV file (all or selected by ID).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { context } = await requirePermission(
      session.user.id,
      "forms-submissions:export"
    );

    const body = await request.json().catch(() => ({}));
    const selectedSubmissionIds = body.submissionIds as string[] | undefined;

    const csv = await submissionService.exportSubmissionsAsCSV(
      context.organizationId,
      resolvedParams.id,
      selectedSubmissionIds
    );

    const filename = `form-submissions-${resolvedParams.id}-${
      new Date().toISOString().split("T")[0]
    }.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") {
      return NextResponse.json({ message: "Permission denied." }, { status: 403 });
    }
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    console.error("POST /api/forms/[id]/submissions/export error:", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
