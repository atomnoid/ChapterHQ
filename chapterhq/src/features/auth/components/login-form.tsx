"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const callbackUrl = useMemo(
    () => searchParams.get("callbackUrl") ?? "/dashboard",
    [searchParams]
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    if (result?.error) {
      setErrorMessage("Invalid email or password.");
      setIsSubmitting(false);
      return;
    }

    router.push(result?.url ?? callbackUrl);
    router.refresh();
  };

  return (
    <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-[#b08968]"
          placeholder="you@chapterhq.com"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-secondary-foreground hover:text-foreground"
          >
            Forgot?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-[#b08968]"
          placeholder="••••••••"
        />
      </div>

      {errorMessage ? (
        <p className="rounded-xl border border-[#d9b6a2] bg-[#fdf3ec] px-3 py-2 text-sm text-[#8e4f31]">
          {errorMessage}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-11 w-full rounded-full bg-primary text-primary-foreground hover:bg-[#4a3228]"
      >
        {isSubmitting ? "Signing in..." : "Login"}
      </Button>
    </form>
  );
}