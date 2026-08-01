import type { Metadata } from "next";
import { EventDetails } from "@/features/events/components/event-details";

export const metadata: Metadata = {
  title: "Event Details — ChapterHQ",
  description: "View registrations, track stats, and manage attendees.",
};

export default async function EventDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="space-y-6 pb-8">
      <section className="overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(77,54,37,0.08)] sm:p-8">
        <EventDetails eventId={id} />
      </section>
    </div>
  );
}
