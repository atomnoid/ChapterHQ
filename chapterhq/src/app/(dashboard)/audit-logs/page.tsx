import type { Metadata } from "next";
import { AuditLogList } from "@/features/audit/components/audit-log-list";

export const metadata: Metadata = {
  title: "Audit Logs — ChapterHQ",
  description: "Review a full history of all actions performed in your organization.",
};

export default function AuditLogsPage() {
  return (
    <div className="space-y-6 pb-8">
      <section className="overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(77,54,37,0.08)] sm:p-8">
        <div className="mb-6">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-secondary-foreground">
            Security
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
            Audit Logs
          </h2>
          <p className="mt-1.5 text-sm text-secondary-foreground">
            A complete record of actions performed in your organization.
          </p>
        </div>
        <AuditLogList />
      </section>
    </div>
  );
}
