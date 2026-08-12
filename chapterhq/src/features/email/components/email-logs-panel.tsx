"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type EmailLog = {
  id: string;
  recipient: string;
  subject: string;
  type: string;
  status: string;
  errorMessage?: string | null;
  createdAt: string;
  sentAt?: string | null;
  template?: { name: string } | null;
};

export function EmailLogsPanel() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/email-logs")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message ?? "Unable to load email logs.");
        setLogs(payload.data?.items ?? []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load email logs."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center gap-2 text-sm text-secondary-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading email logs</div>;
  if (error) return <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>;

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-border bg-background">
      <table className="w-full text-left text-sm">
        <thead className="bg-secondary text-xs uppercase text-secondary-foreground">
          <tr><th className="px-4 py-3">Recipient</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Template</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Failure</th></tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-t border-border">
              <td className="px-4 py-3">{log.recipient}</td>
              <td className="px-4 py-3">{log.type}</td>
              <td className="px-4 py-3">{log.template?.name ?? "None"}</td>
              <td className="px-4 py-3">{log.status}</td>
              <td className="px-4 py-3">{new Date(log.sentAt ?? log.createdAt).toLocaleString()}</td>
              <td className="max-w-xs truncate px-4 py-3">{log.errorMessage ?? ""}</td>
            </tr>
          ))}
          {logs.length === 0 ? <tr><td className="px-4 py-8 text-center text-secondary-foreground" colSpan={6}>No email logs yet.</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}
