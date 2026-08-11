"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const { data: session } = useSession();
  const activeCommitteeId = session?.activeCommitteeId ?? null;

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/unread-count");
      if (res.ok) {
        const json = await res.json();
        const count = json?.data?.count ?? json?.count ?? 0;
        setUnreadCount(count);
      }
    } catch {
      // Silent — don't break the header
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    // Poll every 60 seconds
    const interval = setInterval(fetchUnreadCount, 60_000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount, activeCommitteeId]); // re-fetch when committee changes

  return (
    <Link href="/notifications" aria-label="Notifications">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="relative rounded-full border-border bg-card text-foreground"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span
            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground ring-2 ring-background"
            aria-label={`${unreadCount} unread notifications`}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>
    </Link>
  );
}
