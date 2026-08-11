import Link from "next/link";

import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 sm:px-6 lg:px-8">
      <section className="w-full max-w-md rounded-[1.75rem] border border-border bg-card p-7 shadow-[0_20px_60px_rgba(77,54,37,0.08)] sm:p-8">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-secondary-foreground">
            ChapterHQ
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground">
            Welcome back
          </h1>
          <p className="mt-2 text-sm leading-6 text-secondary-foreground">
            Sign in to continue to your dashboard.
          </p>
        </div>

        <LoginForm />

        <p className="mt-6 text-sm text-secondary-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-foreground hover:underline">
            Create one
          </Link>
        </p>
      </section>
    </main>
  );
}