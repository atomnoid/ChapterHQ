import type { Metadata } from "next";
import { AttendanceList } from "@/features/attendance/components/attendance-list";

export const metadata: Metadata = {
  title: "Organization Attendance — ChapterHQ",
  description: "Mark, verify, and browse member attendance logs for organizational events.",
};

export default function AttendancePage() {
  // Use a placeholder/empty eventId or list global if needed.
  // In our schema and API, attendance requires an event context.
  // Let's inform the user to select an event, or load the latest event attendance.
  // A clean pattern is to present a quick info/redirect panel to events dashboard if no event context is active.
  return (
    <div className="space-y-6 pb-8">
      <section className="overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(77,54,37,0.08)] sm:p-8">
        <div className="mb-6">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-secondary-foreground">
            Tracking
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
            Attendance
          </h2>
        </div>
        <div className="rounded-2xl border border-dashed border-border p-8 text-center max-w-lg mx-auto my-8 space-y-4">
          <p className="text-sm text-secondary-foreground">
            Attendance logs are managed directly within the context of specific events. Please select an event from the calendar to mark attendee presence.
          </p>
          <a href="/dashboard/events" className="inline-block">
            <button className="h-10 rounded-full bg-primary text-primary-foreground px-5 text-sm font-medium hover:bg-primary/95 transition-colors">
              Go to Events
            </button>
          </a>
        </div>
      </section>
    </div>
  );
}
