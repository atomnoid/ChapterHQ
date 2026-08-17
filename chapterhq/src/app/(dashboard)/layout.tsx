import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/layouts/dashboard-shell";
import { DEFAULT_UNAUTHENTICATED_REDIRECT } from "@/constants/routes";
import { auth } from "@/lib/auth";
import { MemberRepository } from "@/repositories/member.repository";
import { CustomFormOnboardingService } from "@/services/custom-form-onboarding.service";

const memberRepository = new MemberRepository();
const onboardingService = new CustomFormOnboardingService();

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect(DEFAULT_UNAUTHENTICATED_REDIRECT);
  }

  // Enforce onboarding check if user belongs to an active organization
  const activeOrgId = session.activeOrganizationId;
  if (activeOrgId) {
    const member = await memberRepository.findByOrganizationAndUser(
      activeOrgId,
      session.user.id
    );
    
    if (member) {
      const isOnboarded = await onboardingService.isMemberFullyOnboarded(
        activeOrgId,
        member.id
      );
      
      if (!isOnboarded) {
        redirect("/onboarding");
      }
    }
  }

  return (
    <DashboardShell
      user={{
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: session.user.image ?? null,
      }}
    >
      {children}
    </DashboardShell>
  );
}