"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Layers, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Committee {
  id: string;
  name: string;
  description: string | null;
}

interface Role {
  id: string;
  name: string;
}

export function RoleCommitteeAccessDialog({
  role,
  open,
  onOpenChange,
  onSuccess,
}: {
  role: Role | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [selectedCommitteeIds, setSelectedCommitteeIds] = useState<Set<string>>(
    new Set()
  );
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !role) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [committeesRes, accessRes] = await Promise.all([
          fetch(`/api/committees?limit=100`),
          fetch(`/api/roles/${role.id}/committees`),
        ]);

        if (!committeesRes.ok) {
          const errData = await committeesRes.json().catch(() => ({}));
          throw new Error(
            `Failed to load committees: ${errData.message || "Unknown error"}`
          );
        }

        if (!accessRes.ok) {
          const errData = await accessRes.json().catch(() => ({}));
          throw new Error(
            `Failed to load role access: ${errData.message || "Unknown error"}`
          );
        }

        const committeesData = await committeesRes.json();
        const accessData = await accessRes.json();

        const allCommittees = committeesData.data ?? committeesData ?? [];
        const grantedCommittees = accessData.data ?? accessData ?? [];
        const grantedIds = new Set<string>(
          grantedCommittees.map((c: Committee) => c.id)
        );

        setCommittees(allCommittees);
        setSelectedCommitteeIds(grantedIds);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load data.";
        setError(msg);
        console.error("[RoleCommitteeAccessDialog]", msg);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [open, role]);

  const filteredCommittees = committees.filter((committee) => {
    const haystack = `${committee.name} ${committee.description ?? ""}`
      .toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  const handleSelectAll = () => {
    setSelectedCommitteeIds(new Set(committees.map((c) => c.id)));
  };

  const handleClearAll = () => {
    setSelectedCommitteeIds(new Set());
  };

  const handleToggle = (committeeId: string) => {
    setSelectedCommitteeIds((prev) => {
      const next = new Set(prev);
      if (next.has(committeeId)) next.delete(committeeId);
      else next.add(committeeId);
      return next;
    });
  };

  const handleSave = async () => {
    if (!role) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/roles/${role.id}/committees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          committeeIds: Array.from(selectedCommitteeIds),
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message ?? "Failed to update committee access.");
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!role) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Committee Access for {role.name}
          </DialogTitle>
          <DialogDescription>
            Select which committees this role can access. Members with this role
            will only see committees you select here.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-4">
          {error && (
            <div className="rounded-xl bg-destructive/5 border border-destructive/30 px-3 py-2">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Search and Actions */}
          <div className="flex-shrink-0 space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search committees..."
                className="pl-9"
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-secondary-foreground">
                {selectedCommitteeIds.size} of {committees.length} selected
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full text-xs"
                  onClick={handleSelectAll}
                  disabled={loading || submitting}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full text-xs"
                  onClick={handleClearAll}
                  disabled={loading || submitting}
                >
                  Clear All
                </Button>
              </div>
            </div>
          </div>

          {/* Committees List */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-secondary-foreground">
                Loading committees...
              </p>
            </div>
          ) : committees.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-secondary-foreground">
                No committees available in this organization.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredCommittees.length === 0 ? (
                <p className="text-sm text-secondary-foreground text-center py-8">
                  No committees match your search.
                </p>
              ) : (
                filteredCommittees.map((committee) => (
                  <label
                    key={committee.id}
                    className="flex cursor-pointer items-start justify-between rounded-xl border border-border bg-card hover:bg-secondary/20 px-3 py-2 transition-colors"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {committee.name}
                      </span>
                      {committee.description && (
                        <span className="block truncate text-xs text-secondary-foreground">
                          {committee.description}
                        </span>
                      )}
                    </span>
                    <div className="flex-shrink-0 ml-3">
                      <input
                        type="checkbox"
                        checked={selectedCommitteeIds.has(committee.id)}
                        onChange={() => handleToggle(committee.id)}
                        className="h-4 w-4 accent-primary"
                      />
                    </div>
                  </label>
                ))
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border pt-4 flex-shrink-0">
          <Button
            variant="outline"
            className="rounded-full"
            disabled={submitting || loading}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="rounded-full"
            disabled={submitting || loading}
            onClick={handleSave}
          >
            {submitting ? "Saving..." : "Save Committee Access"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
