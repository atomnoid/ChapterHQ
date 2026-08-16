import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { CustomFormOnboardingService } from "@/services/custom-form-onboarding.service";
import { MemberRepository } from "@/repositories/member.repository";

const onboardingService = new CustomFormOnboardingService();
const memberRepository = new MemberRepository();

/**
 * GET /api/member/onboarding-forms
 * Get the current member's onboarding status (required forms and completion status).
 * Used by the frontend to determine if member needs to complete forms before accessing dashboard.
 *
 * NOTE: No permission check here by design — new members being onboarded have no roles/
 * permissions yet. Authentication alone is sufficient; data is scoped to the user's own
 * membership record, so there is no cross-tenant risk.
 */
export async function GET(request: Request) {
  try {
    console.log("[onboarding-forms] step: auth()");
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const userId = session.user.id;
    console.log("[onboarding-forms] userId:", userId, "sessionOrgId:", session.activeOrganizationId);

    // Derive organizationId from the session (set by the JWT callback) or fall back
    // to the user's first active membership.
    let organizationId: string | undefined = session.activeOrganizationId;

    if (!organizationId) {
      console.log("[onboarding-forms] step: fallback findActiveByUserId");
      const fallbackMember = await memberRepository.findActiveByUserId(userId);
      organizationId = fallbackMember?.organizationId;
      console.log("[onboarding-forms] fallback orgId:", organizationId ?? "NONE");
    }

    if (!organizationId) {
      return NextResponse.json(
        { message: "You are not a member of any organization." },
        { status: 403 }
      );
    }

    console.log("[onboarding-forms] step: findByOrganizationAndUser", organizationId, userId);
    const member = await memberRepository.findByOrganizationAndUser(
      organizationId,
      userId
    );
    console.log("[onboarding-forms] member:", member?.id ?? "NULL");

    if (!member) {
      return NextResponse.json(
        { message: "You are not a member of this organization." },
        { status: 403 }
      );
    }

    console.log("[onboarding-forms] step: getMemberOnboardingStatus");
    const onboardingStatus = await onboardingService.getMemberOnboardingStatus(
      organizationId,
      member.id
    );

    console.log("[onboarding-forms] step: isMemberFullyOnboarded");
    const isOnboarded = await onboardingService.isMemberFullyOnboarded(
      organizationId,
      member.id
    );

    console.log("[onboarding-forms] done — isOnboarded:", isOnboarded);
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
    console.error("[onboarding-forms] CAUGHT ERROR:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ message }, { status: 500 });
  }
}
