import Link from "next/link";

import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 sm:px-6 lg:px-8">
      <section className="w-full max-w-md rounded-[1.75rem] border border-border bg-card p-7 shadow-[0_20px_60px_rgba(77,54,37,0.08)] sm:p-8">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-secondary-foreground">
            ChapterHQ
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground">
            Reset password
          </h1>
          <p className="mt-2 text-sm leading-6 text-secondary-foreground">
            Enter your email and we&apos;ll prepare a secure reset request.
          </p>
        </div>

        <ForgotPasswordForm />

        <p className="mt-6 text-sm text-secondary-foreground">
          Back to{" "}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            Login
          </Link>
        </p>
      </section>
    </main>
  );
}