import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/layouts/dashboard-shell";
import { DEFAULT_UNAUTHENTICATED_REDIRECT } from "@/constants/routes";
import { auth } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect(DEFAULT_UNAUTHENTICATED_REDIRECT);
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