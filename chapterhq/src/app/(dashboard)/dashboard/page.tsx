import { LogOut } from "lucide-react";

import { DashboardLogoutButton } from "@/features/auth/components/dashboard-logout-button";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-6xl rounded-[2rem] border border-border bg-card p-7 shadow-[0_20px_60px_rgba(77,54,37,0.08)] sm:p-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-secondary-foreground">
              ChapterHQ
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-foreground">
              Dashboard
            </h1>
            <p className="mt-2 text-sm leading-6 text-secondary-foreground">
              Signed in as {session?.user?.email}
            </p>
          </div>

          <DashboardLogoutButton>
            <LogOut className="h-4 w-4" />
            Logout
          </DashboardLogoutButton>
        </header>

        <div className="mt-8 rounded-2xl border border-border bg-[#fcf8f1] p-6">
          <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">
            Welcome to ChapterHQ
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-secondary-foreground">
            Your authentication module is active. Continue with organization
            onboarding and role setup to unlock tenant-specific workflows.
          </p>
        </div>
      </section>
    </main>
  );
}