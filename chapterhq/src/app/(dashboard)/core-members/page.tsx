import { CoreMemberList } from "@/features/members/components/core-member-list";

export const metadata = {
  title: "Core Members — ChapterHQ",
  description: "View and manage designated core members.",
};

export default function CoreMembersPage() {
  return (
    <div className="space-y-6 pb-8">
      <section className="overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(77,54,37,0.08)] sm:p-8">
        <div className="mb-6">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-secondary-foreground">
            Leadership
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
            Core Members
          </h2>
        </div>
        <CoreMemberList />
      </section>
    </div>
  );
}
