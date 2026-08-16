"use client";

import { ShieldOff } from "lucide-react";

export function UnauthorizedIcon() {
  return (
    <span className="flex h-20 w-20 items-center justify-center rounded-full border border-border bg-card shadow-[0_12px_30px_rgba(77,54,37,0.08)]">
      <ShieldOff className="h-8 w-8 text-secondary-foreground" />
    </span>
  );
}
