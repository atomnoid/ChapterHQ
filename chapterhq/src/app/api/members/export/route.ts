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

    const body = await request.json();
    const { memberIds } = body as { memberIds?: string[] };

    // Fetch members and their form submissions
    const members = await prisma.member.findMany({
      where: {
        organizationId: context.organizationId,
        ...(memberIds && memberIds.length > 0 ? { id: { in: memberIds } } : {}),
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        submissions: {
          where: {
            organizationId: context.organizationId,
          },
          include: {
            form: {
              select: {
                name: true,
                fields: true,
              },
            },
            answers: {
              include: {
                field: true,
              },
            },
          },
        },
      },
    });

    const activeMembers = members.filter((m) => !m.deletedAt);

    // Escape CSV values
    const escape = (val: string | null | undefined): string => {
      if (!val) return "";
      const stringValue = String(val);
      if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    // Construct headers: Basic Info + All Unique Form Questions
    const basicHeaders = ["Member Name", "Member Email", "Joined Date", "Status"];
    const formsInOrg = await prisma.customForm.findMany({
      where: {
        organizationId: context.organizationId,
        deletedAt: null,
      },
      select: {
        name: true,
        fields: true,
      },
    });

    const formFieldHeaders: string[] = [];
    const fieldMap: Record<string, string> = {}; // label -> key/id mapping

    for (const f of formsInOrg) {
      for (const field of f.fields as any[]) {
        const header = `${f.name} - ${field.label}`;
        if (!formFieldHeaders.includes(header)) {
          formFieldHeaders.push(header);
          fieldMap[header] = field.key;
        }
      }
    }

    const allHeaders = [...basicHeaders, ...formFieldHeaders];
    const rows: string[] = [allHeaders.map(escape).join(",")];

    for (const member of activeMembers) {
      const row: string[] = [
        escape(member.user?.name || ""),
        escape(member.user?.email || ""),
        escape(new Date(member.joinedAt).toLocaleDateString()),
        escape(member.status),
      ];

      // Match answers
      for (const header of formFieldHeaders) {
        const fieldKey = fieldMap[header];
        let matchedValue = "";

        for (const sub of member.submissions) {
          const matchingAnswer = sub.answers.find((a) => a.field.key === fieldKey);
          if (matchingAnswer) {
            matchedValue = matchingAnswer.value || "";
            break;
          }
        }
        row.push(escape(matchedValue));
      }

      rows.push(row.join(","));
    }

    const csvContent = rows.join("\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="member-onboarding-export-${new Date().toISOString().split("T")[0]}.csv"`,
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
