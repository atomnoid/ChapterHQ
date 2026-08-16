import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { CustomFormOnboardingService } from "@/services/custom-form-onboarding.service";
import { MemberRepository } from "@/repositories/member.repository";

const onboardingService = new CustomFormOnboardingService();
const memberRepository = new MemberRepository();

/**
 * GET /api/member/onboarding-forms
 * Get the current member's onboarding status (required forms and completion status)
 * Used by the frontend to determine if member needs to complete forms before accessing dashboard
 */
export async function GET(request: Request) {
  try {
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

    const onboardingStatus = await onboardingService.getMemberOnboardingStatus(
      context.organizationId,
      member.id
    );

    const isOnboarded = await onboardingService.isMemberFullyOnboarded(
      context.organizationId,
      member.id
    );

    return NextResponse.json(
      {
        isOnboarded,
        requiredForms: onboardingStatus.requiredForms,
        completedForms: onboardingStatus.completedForms,
        incompleteRequired: onboardingStatus.incompleteRequired,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") {
      return NextResponse.json({ message: "Permission denied." }, { status: 403 });
    }
    console.error("GET /api/member/onboarding-forms error:", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
