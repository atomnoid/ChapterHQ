import type { Metadata } from "next";
import { DashboardContent } from "@/features/dashboard/components/dashboard-content";

export const metadata: Metadata = {
  title: "Dashboard — ChapterHQ",
  description: "Your workspace management overview.",
};

export default function DashboardPage() {
  return (
    <div className="space-y-6 pb-8">
      <section className="overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(77,54,37,0.08)] sm:p-8">
        <DashboardContent />
      </section>
    </div>
  );
}