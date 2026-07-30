"use client";

import { signOut } from "next-auth/react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

export function DashboardLogoutButton({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <Button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="h-10 rounded-full bg-primary px-4 text-primary-foreground hover:bg-[#4a3228]"
    >
      {children}
    </Button>
  );
}