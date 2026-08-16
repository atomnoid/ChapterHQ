import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { CustomFormSubmissionService } from "@/services/custom-form-submission.service";
import { submitCustomFormSchema } from "@/validators/custom-form.validator";
import { MemberRepository } from "@/repositories/member.repository";

const submissionService = new CustomFormSubmissionService();
const memberRepository = new MemberRepository();

/**
 * POST /api/forms/[id]/submit
 * Submit a form response
 * Requires the member to be authenticated and belong to the organization
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

    const { context } = await requirePermission(session.user.id, "forms:read");

    // Get the current member
    const member = await memberRepository.findByOrganizationAndUser(
      context.organizationId,
      session.user.id
    );

    if (!member) {
      return NextResponse.json({ message: "You are not a member of this organization." }, { status: 403 });
    }

    const body = await request.json();
    const input = submitCustomFormSchema.parse(body);

    const { submission, isNew } = await submissionService.submitForm(
      context.organizationId,
      resolvedParams.id,
      member.id,
      session.user.id,
      input
    );

    return NextResponse.json(
      {
        submission,
        isNew,
        message: isNew ? "Form submitted successfully." : "Form updated successfully.",
      },
      { status: isNew ? 201 : 200 }
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") {
      return NextResponse.json({ message: "Permission denied." }, { status: 403 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Invalid request." },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    if (error instanceof Error && error.message.includes("Field") && error.message.includes("required")) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (
      error instanceof Error &&
      (error.message.includes("must be") || error.message.includes("invalid"))
    ) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("POST /api/forms/[id]/submit error:", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
