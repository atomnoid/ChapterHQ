import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { DEFAULT_UNAUTHENTICATED_REDIRECT } from "@/constants/routes";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect(DEFAULT_UNAUTHENTICATED_REDIRECT);
  }

  return <>{children}</>;
}