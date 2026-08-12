import { EmailLogsPanel } from "@/features/email/components/email-logs-panel";

export default function EmailLogsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Email Logs</h1>
        <p className="mt-1 text-sm text-secondary-foreground">Review recent organization email delivery attempts.</p>
      </div>
      <EmailLogsPanel />
    </div>
  );
}
