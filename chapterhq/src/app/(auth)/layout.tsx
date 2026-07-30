import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { DEFAULT_AUTHENTICATED_REDIRECT } from "@/constants/routes";

export default async function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  if (session?.user?.id) {
    redirect(DEFAULT_AUTHENTICATED_REDIRECT);
  }

  return <>{children}</>;
}