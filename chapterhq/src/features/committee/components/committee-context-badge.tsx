"use client";

import { Layers } from "lucide-react";
import { useSession } from "next-auth/react";
import { useMyCommittees } from "@/features/committee/hooks/use-my-committees";
import { cn } from "@/lib/utils";

/**
 * CommitteeContextBadge
 *
 * Displays the currently active committee name in the header bar.
 * Shows "All Committees" when activeCommitteeId is null.
 * Renders nothing while the session is loading or no org context exists.
 * Does not perform any switching — display only.
 */
export function CommitteeContextBadge() {
  const { data: session, status } = useSession();

  const activeOrganizationId = session?.activeOrganizationId ?? null;
  const activeCommitteeId = session?.activeCommitteeId ?? null;

  const { committees, loading } = useMyCommittees(activeOrganizationId);

  // Don't render until the session is resolved.
  if (status === "loading") return null;

  // Don't render if the user has no org context.
  if (!activeOrganizationId) return null;

  // While committees are loading, show a skeleton pill.
  if (loading) {
    return (
      <div
        aria-hidden="true"
        className="flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 py-1.5"
      >
        <span className="h-3 w-20 animate-pulse rounded-full bg-secondary/50" />
      </div>
    );
  }

  // Resolve the display name from the fetched list.
  const activeCommittee = committees.find((c) => c.id === activeCommitteeId) ?? null;
  const label = activeCommittee?.name ?? "All Committees";
  const isScoped = activeCommittee !== null;

  return (
    <div
      aria-label={`Active committee context: ${label}`}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold",
        isScoped
          ? "border-primary/25 bg-primary/10 text-primary"
          : "border-border/70 bg-card text-secondary-foreground"
      )}
    >
      <Layers className="h-3 w-3 shrink-0" />
      <span className="max-w-[10rem] truncate">{label}</span>
    </div>
  );
}
