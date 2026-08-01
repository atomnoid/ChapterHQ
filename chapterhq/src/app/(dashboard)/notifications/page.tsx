import type { Metadata } from "next";
import { NotificationList } from "@/features/notification/components/notification-list";

export const metadata: Metadata = {
  title: "Notifications — ChapterHQ",
  description: "View and manage your notifications and activity updates.",
};

export default function NotificationsPage() {
  return (
    <div className="space-y-6 pb-8">
      <section className="overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(77,54,37,0.08)] sm:p-8">
        <div className="mb-6">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-secondary-foreground">Updates</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">Notifications</h2>
        </div>
        <NotificationList />
      </section>
    </div>
  );
}
