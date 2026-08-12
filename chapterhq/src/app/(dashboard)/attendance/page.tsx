"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { Clock, MapPin, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Event {
  id: string;
  title: string;
  description: string | null;
  venue: string | null;
  startDate: string;
  status: string;
}

interface EventsResponse {
  items: Event[];
  total: number;
}

export default function AttendancePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/events?limit=25");
      if (!res.ok) throw new Error("Failed to load events.");
      const json = await res.json();
      const result: EventsResponse = json?.data ?? json;
      setEvents(result.items ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load events.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6 pb-8">
      <section className="overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(77,54,37,0.08)] sm:p-8">
        <div className="mb-6">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-secondary-foreground">
            Tracking
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
            Event Attendance
          </h2>
          <p className="mt-1.5 text-sm text-secondary-foreground">
            Select an event below to manage registrations and mark attendee presence.
          </p>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-3 rounded-full" onClick={fetchEvents}>
              Try Again
            </Button>
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center max-w-lg mx-auto my-8 space-y-4">
            <p className="text-sm text-secondary-foreground">
              No events scheduled in your organization. Please create an event first to track attendance.
            </p>
            <Link href="/events" className="inline-block">
              <Button className="rounded-full">Create Event</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex flex-col justify-between rounded-2xl border border-border bg-background p-5 shadow-sm transition-all hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-foreground line-clamp-1">{event.title}</h3>
                    <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold capitalize text-secondary-foreground">
                      {event.status.toLowerCase()}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-secondary-foreground line-clamp-2 min-h-[2rem]">
                    {event.description ?? "No description provided."}
                  </p>
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-secondary-foreground">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      <span>{formatDate(event.startDate)}</span>
                    </div>
                    {event.venue && (
                      <div className="flex items-center gap-2 text-xs text-secondary-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{event.venue}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 border-t border-border pt-4 flex items-center justify-end">
                  <Link href={`/events/${event.id}`}>
                    <Button size="sm" className="rounded-full text-xs gap-1.5 h-8">
                      Mark Attendance <ChevronRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
