import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function OnboardingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,rgba(176,137,104,0.09),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(92,64,51,0.06),transparent_38%)] bg-background">
      {/* Minimal top bar */}
      <header className="flex h-14 shrink-0 items-center border-b border-border/60 px-6">
        <span className="text-sm font-semibold uppercase tracking-[0.22em] text-foreground">
          ChapterHQ
        </span>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        {children}
      </main>
    </div>
  );
}
