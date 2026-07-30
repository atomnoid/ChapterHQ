import Link from "next/link";

import { SignupForm } from "@/features/auth/components/signup-form";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 sm:px-6 lg:px-8">
      <section className="w-full max-w-md rounded-[1.75rem] border border-border bg-card p-7 shadow-[0_20px_60px_rgba(77,54,37,0.08)] sm:p-8">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-secondary-foreground">
            ChapterHQ
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground">
            Create your account
          </h1>
          <p className="mt-2 text-sm leading-6 text-secondary-foreground">
            Build and manage your student organization from one platform.
          </p>
        </div>

        <SignupForm />

        <p className="mt-6 text-sm text-secondary-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}