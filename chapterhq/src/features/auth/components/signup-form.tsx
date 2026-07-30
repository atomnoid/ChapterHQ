"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";

interface SignupResponse {
  message: string;
}

export function SignupForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        email,
        password,
        confirmPassword,
      }),
    });

    const payload = (await response.json()) as SignupResponse;

    if (!response.ok) {
      setErrorMessage(payload.message);
      setIsSubmitting(false);
      return;
    }

    router.push("/login?registered=1");
    router.refresh();
  };

  return (
    <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="name" className="text-sm font-medium text-foreground">
          Full name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-[#b08968]"
          placeholder="Avery Johnson"
        />
      </div>

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
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-[#b08968]"
          placeholder="At least 8 characters"
        />
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="text-sm font-medium text-foreground"
        >
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-[#b08968]"
          placeholder="Repeat your password"
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
        {isSubmitting ? "Creating account..." : "Sign up"}
      </Button>
    </form>
  );
}