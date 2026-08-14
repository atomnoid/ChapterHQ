"use client";

import { useEffect, useState } from "react";
/* eslint-disable react-hooks/set-state-in-effect */

export interface Committee {
  id: string;
  name: string;
  description: string | null;
}

/**
 * Fetches the committees the authenticated user can access for their active
 * organization. Re-runs whenever the active organization changes.
 * Hits GET /api/me/committees â€” a trusted server-side endpoint.
 */
export function useMyCommittees(activeOrganizationId: string | null | undefined) {
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeOrganizationId) {
      setCommittees([]);
      setIsAdmin(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch("/api/me/committees")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled) return;
        console.log("[useMyCommittees] API response:", json);
        const isAdminFlag = json?.isAdmin ?? false;
        const items: Committee[] = json?.committees ?? json?.data ?? json ?? [];
        console.log("[useMyCommittees] Parsed items:", items.length, "committees, isAdmin:", isAdminFlag);
        setIsAdmin(isAdminFlag);
        setCommittees(Array.isArray(items) ? items : []);
      })
      .catch((err) => {
        console.error("[useMyCommittees] Fetch error:", err);
        if (!cancelled) {
          setCommittees([]);
          setIsAdmin(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeOrganizationId]);

  return { committees, isAdmin, loading };
}
