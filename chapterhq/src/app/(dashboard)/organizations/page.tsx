import type { Metadata } from "next";
import { OrganizationList } from "@/features/organizations/components/organization-list";

export const metadata: Metadata = {
  title: "Organizations — ChapterHQ",
  description: "Manage your ChapterHQ organizations and workspaces.",
};

export default function OrganizationsPage() {
  return (
    <div className="space-y-6 pb-8">
      <section className="overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(77,54,37,0.08)] sm:p-8">
        <OrganizationList />
      </section>
    </div>
  );
}
