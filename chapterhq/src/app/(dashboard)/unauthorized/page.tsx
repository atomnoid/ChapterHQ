import type { Metadata } from "next";
import Link from "next/link";
import { UnauthorizedIcon } from "./unauthorized-icon";

export const metadata: Metadata = {
  title: "Access Denied — ChapterHQ",
  description: "You do not have permission to access this page.",
};

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <UnauthorizedIcon />

      <h1 className="mt-6 text-2xl font-bold tracking-[-0.04em] text-foreground">
        Access Denied
      </h1>

      <p className="mt-2 max-w-sm text-sm text-secondary-foreground">
        You don&apos;t have the required permissions to view this page. Contact
        your organization administrator if you believe this is a mistake.
      </p>

      <Link
        href="/dashboard"
        className="mt-8 inline-flex items-center rounded-full border border-border bg-card px-6 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-secondary"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
