import type { Metadata } from "next";
import { FormList } from "@/features/forms/components/form-list";

export const metadata: Metadata = {
  title: "Forms — ChapterHQ",
  description: "Create and manage custom onboarding forms.",
};

export default function FormsPage() {
  return (
    <div className="space-y-6 pb-8">
      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(77,54,37,0.08)] sm:p-8">
        <div className="mb-6">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-secondary-foreground">
            Onboarding
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
            Custom Forms
          </h2>
          <p className="mt-1.5 text-sm text-secondary-foreground">
            Create and manage custom forms for new member onboarding.
          </p>
        </div>
        <FormList />
      </section>
    </div>
  );
}
