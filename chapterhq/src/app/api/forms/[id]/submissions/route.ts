import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { CustomFormSubmissionService } from "@/services/custom-form-submission.service";
import { parsePaginationQuery } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

const submissionService = new CustomFormSubmissionService();

/**
 * GET /api/forms/[id]/submissions
 * List submissions for a form
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { context } = await requirePermission(session.user.id, "forms-submissions:read");

    const { searchParams } = new URL(request.url);
    const pagination = parsePaginationQuery(searchParams);

    const { submissions, total } = await submissionService.listSubmissions(
      context.organizationId,
      resolvedParams.id,
      {
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }
    );

    // Manually fetch member+user data for these submissions
    const memberIds = [...new Set(submissions.map((s: any) => s.memberId))];
    const members = memberIds.length > 0
      ? await prisma.member.findMany({
          where: { id: { in: memberIds } },
          include: { user: { select: { name: true, email: true, image: true } } },
        })
      : [];
    const memberMap = new Map(members.map((m: any) => [m.id, m]));

    const formattedSubmissions = submissions.map((sub: any) => {
      const member = memberMap.get(sub.memberId) as any;
      return {
        id: sub.id,
        memberId: sub.memberId,
        memberName: member?.user?.name || "Unknown",
        memberEmail: member?.user?.email || "",
        createdAt: sub.submittedAt ? sub.submittedAt.toISOString() : new Date().toISOString(),
        answers: (sub.answers || []).reduce((acc: any, ans: any) => {
          if (ans.field?.key) acc[ans.field.key] = ans.value;
          return acc;
        }, {}),
      };
    });

    return NextResponse.json(
      {
        items: formattedSubmissions,
        total,
        page: pagination.page,
        limit: pagination.limit,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") {
      return NextResponse.json({ message: "Permission denied." }, { status: 403 });
    }
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    console.error("GET /api/forms/[id]/submissions error:", error);
    const errMsg = error instanceof Error ? error.message : "Internal server error.";
    return NextResponse.json({ message: errMsg }, { status: 500 });
  }
}

/**
 * POST /api/forms/[id]/submissions/export
 * Export submissions as CSV
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

    const { context } = await requirePermission(session.user.id, "forms-submissions:export");

    const body = await request.json();
    const selectedSubmissionIds = body.submissionIds as string[] | undefined;

    const csv = await submissionService.exportSubmissionsAsCSV(
      context.organizationId,
      resolvedParams.id,
      selectedSubmissionIds
    );

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="form-submissions-${resolvedParams.id}-${new Date().toISOString().split("T")[0]}.csv"`,
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
