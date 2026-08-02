import { OnboardingForm } from "@/features/onboarding/components/onboarding-form";

export default function OnboardingPage() {
  return (
    <section className="w-full max-w-2xl rounded-[2rem] border border-border bg-card p-6 shadow-[0_24px_60px_rgba(77,54,37,0.08)] sm:p-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-secondary-foreground">
          ChapterHQ
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground">
          Set up your organization
        </h1>
        <p className="mt-2 text-sm leading-6 text-secondary-foreground">
          Create your workspace first, then create the super admin account in one submission.
        </p>
      </div>

      <OnboardingForm />
    </section>
  );
}
