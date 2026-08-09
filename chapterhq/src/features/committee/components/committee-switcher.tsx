"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Check, ChevronDown, Layers, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Committee {
  id: string;
  name: string;
  description: string | null;
}

// ---------------------------------------------------------------------------
// Hook — fetch user-accessible committees from the trusted server endpoint.
// Re-fetches whenever the active organization changes.
// ---------------------------------------------------------------------------

function useMyCommittees(activeOrganizationId: string | null | undefined) {
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeOrganizationId) {
      setCommittees([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch("/api/me/committees")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled) return;
        const items: Committee[] = json?.data ?? json ?? [];
        setCommittees(Array.isArray(items) ? items : []);
      })
      .catch(() => {
        if (!cancelled) setCommittees([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeOrganizationId]);

  return { committees, loading };
}

// ---------------------------------------------------------------------------
// CommitteeSwitcher
// ---------------------------------------------------------------------------

export function CommitteeSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeOrganizationId = session?.activeOrganizationId ?? null;
  const activeCommitteeId = session?.activeCommitteeId ?? null;

  const { committees, loading } = useMyCommittees(activeOrganizationId);

  const activeCommittee = committees.find((c) => c.id === activeCommitteeId) ?? null;

  // Close on outside click.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const switchCommittee = useCallback(
    async (committeeId: string | null) => {
      if (switching) return;
      if (committeeId === activeCommitteeId) {
        setOpen(false);
        return;
      }

      setSwitching(true);
      setError(null);

      try {
        // 1. POST to the server-side switch endpoint — the API is the auth boundary.
        const res = await fetch("/api/committees/switch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ committeeId }),
        });

        const payload = await res.json();

        if (!res.ok) {
          throw new Error(payload?.message ?? "Failed to switch committee.");
        }

        // 2. Update the NextAuth JWT session so activeCommitteeId is propagated.
        await update({ activeCommitteeId: committeeId });

        // 3. Revalidate the page so all committee-scoped data refreshes.
        router.refresh();

        setOpen(false);
        onNavigate?.();
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Unable to switch committee."
        );
      } finally {
        setSwitching(false);
      }
    },
    [activeCommitteeId, switching, update, router, onNavigate]
  );

  // Don't render if there are no accessible committees.
  if (!loading && committees.length === 0) return null;

  const label = activeCommittee?.name ?? "All committees";

  return (
    <div ref={dropdownRef} className="relative px-2">
      {/* ── Trigger button ── */}
      <button
        id="committee-switcher-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Switch active committee"
        disabled={switching || loading}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-2xl border border-border/70 bg-[#fcf8f1] px-3.5 py-2.5 text-left text-sm transition-all",
          "hover:border-primary/30 hover:bg-primary/5",
          open && "border-primary/30 bg-primary/5",
          (switching || loading) && "cursor-wait opacity-70"
        )}
      >
        {/* Icon */}
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Layers className="h-3.5 w-3.5" />
        </span>

        {/* Label */}
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-secondary-foreground leading-none mb-0.5">
            Committee
          </span>
          {loading ? (
            <span className="block h-3.5 w-24 animate-pulse rounded-full bg-secondary/40" />
          ) : (
            <span className="block truncate text-xs font-semibold text-foreground">
              {label}
            </span>
          )}
        </span>

        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-secondary-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {/* ── Error message ── */}
      {error && (
        <p className="mt-1.5 px-1 text-[11px] text-destructive">{error}</p>
      )}

      {/* ── Dropdown ── */}
      {open && (
        <div
          role="listbox"
          aria-label="Available committees"
          className={cn(
            "absolute left-0 right-0 z-50 mt-1.5 overflow-hidden rounded-2xl border border-border",
            "bg-card shadow-[0_12px_40px_rgba(77,54,37,0.12)]"
          )}
        >
          {/* "All committees" / clear option */}
          <button
            type="button"
            role="option"
            aria-selected={activeCommitteeId === null}
            onClick={() => switchCommittee(null)}
            disabled={switching}
            className={cn(
              "flex w-full items-center gap-2.5 border-b border-border/60 px-3.5 py-2.5 text-left text-xs font-medium transition-colors",
              activeCommitteeId === null
                ? "bg-primary/8 text-primary"
                : "text-secondary-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
              {activeCommitteeId === null ? (
                <Check className="h-3.5 w-3.5 text-primary" />
              ) : (
                <X className="h-3 w-3 opacity-30" />
              )}
            </span>
            <span>All committees</span>
            <span className="ml-auto text-[10px] text-secondary-foreground/60">
              org-wide
            </span>
          </button>

          {/* Individual committees */}
          <div className="max-h-56 overflow-y-auto py-1">
            {committees.map((committee) => {
              const isActive = committee.id === activeCommitteeId;
              return (
                <button
                  key={committee.id}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => switchCommittee(committee.id)}
                  disabled={switching}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors",
                    isActive
                      ? "bg-primary/8 text-primary"
                      : "text-foreground hover:bg-secondary"
                  )}
                >
                  {/* Active check */}
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                    {isActive ? (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-border" />
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-xs font-semibold",
                        isActive ? "text-primary" : "text-foreground"
                      )}
                    >
                      {committee.name}
                    </span>
                    {committee.description && (
                      <span className="block truncate text-[10px] text-secondary-foreground">
                        {committee.description}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
