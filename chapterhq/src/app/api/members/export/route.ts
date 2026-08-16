import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { context } = await requirePermission(session.user.id, "members:read");
    const { organizationId } = context;

    const body = await request.json();
    const { memberIds } = body as { memberIds?: string[] };

    // 1. Fetch members
    const allMembers = await prisma.member.findMany({
      where: {
        organizationId,
        ...(memberIds && memberIds.length > 0 ? { id: { in: memberIds } } : {}),
      },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    const members = allMembers.filter((m) => !m.deletedAt);

    // 2. Fetch all active forms for this org (for column headers)
    const forms = await prisma.customForm.findMany({
      where: { organizationId, deletedAt: null },
      include: { fields: { orderBy: { order: "asc" } } },
    });

    // 3. Fetch all relevant submissions for these members
    const memberIdList = members.map((m) => m.id);
    const submissions = await prisma.customFormSubmission.findMany({
      where: {
        organizationId,
        memberId: { in: memberIdList },
      },
      include: {
        answers: {
          include: { field: true },
        },
      },
    });

    // Build lookup: memberId -> formId -> Map<fieldKey, value>
    const submissionLookup: Record<string, Record<string, Record<string, string>>> = {};
    for (const sub of submissions) {
      if (!submissionLookup[sub.memberId]) submissionLookup[sub.memberId] = {};
      const answerMap: Record<string, string> = {};
      for (const ans of sub.answers) {
        answerMap[ans.field.key] = ans.value ?? "";
      }
      submissionLookup[sub.memberId][sub.formId] = answerMap;
    }

    // CSV escape helper
    const escape = (val: string | null | undefined): string => {
      if (!val) return "";
      const s = String(val);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    // Build headers
    const basicHeaders = ["Member Name", "Member Email", "Joined Date", "Status"];
    const formFieldHeaders: { label: string; formId: string; fieldKey: string }[] = [];
    for (const form of forms) {
      for (const field of form.fields as { key: string; label: string }[]) {
        formFieldHeaders.push({
          label: `${form.name} - ${field.label}`,
          formId: form.id,
          fieldKey: field.key,
        });
      }
    }

    const allHeaders = [...basicHeaders, ...formFieldHeaders.map((f) => f.label)];
    const rows: string[] = [allHeaders.map(escape).join(",")];

    for (const member of members) {
      const row: string[] = [
        escape(member.user?.name || ""),
        escape(member.user?.email || ""),
        escape(new Date(member.joinedAt).toLocaleDateString()),
        escape(member.status),
      ];

      const memberSubmissions = submissionLookup[member.id] ?? {};
      for (const { formId, fieldKey } of formFieldHeaders) {
        const value = memberSubmissions[formId]?.[fieldKey] ?? "";
        row.push(escape(value));
      }

      rows.push(row.join(","));
    }

    const csvContent = rows.join("\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="member-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") {
      return NextResponse.json({ message: "Permission denied." }, { status: 403 });
    }
    console.error("POST /api/members/export error:", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
