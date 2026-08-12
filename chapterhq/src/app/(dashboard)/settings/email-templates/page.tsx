import { EmailTemplatesPanel } from "@/features/email/components/email-templates-panel";

export default function EmailTemplatesPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Email Templates</h1>
        <p className="mt-1 text-sm text-secondary-foreground">Manage organization-scoped email templates.</p>
      </div>
      <EmailTemplatesPanel />
    </div>
  );
}
