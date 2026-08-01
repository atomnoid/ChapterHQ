import type { Metadata } from "next";
import { CommitteeList } from "@/features/committee/components/committee-list";

export const metadata: Metadata = {
  title: "Committees — ChapterHQ",
  description: "Manage organization committees, members, and leadership appointments.",
};

export default function CommitteesPage() {
  return (
    <div className="space-y-6 pb-8">
      <section className="overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(77,54,37,0.08)] sm:p-8">
        <div className="mb-6">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-secondary-foreground">
            Organization
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
            Committees
          </h2>
        </div>
        <CommitteeList />
      </section>
    </div>
  );
}
