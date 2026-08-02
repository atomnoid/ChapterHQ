"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function OnboardingForm() {
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [organizationDescription, setOrganizationDescription] = useState("");
  const [superAdminName, setSuperAdminName] = useState("");
  const [superAdminEmail, setSuperAdminEmail] = useState("");
  const [superAdminPassword, setSuperAdminPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationName,
            organizationSlug,
            organizationDescription: organizationDescription || undefined,
            superAdminName,
            superAdminEmail,
            superAdminPassword,
            confirmPassword,
          }),
        });

        const payload = (await response.json()) as { message?: string };

        if (!response.ok) {
          setErrorMessage(payload.message ?? "Unable to complete onboarding.");
          return;
        }

        const signInResult = await signIn("credentials", {
          email: superAdminEmail,
          password: superAdminPassword,
          redirect: false,
          callbackUrl: "/dashboard",
        });

        if (signInResult?.error) {
          setErrorMessage("Account was created, but sign-in failed. Please log in.");
          return;
        }

        router.push(signInResult?.url ?? "/dashboard");
        router.refresh();
      } catch {
        setErrorMessage("Something went wrong. Please try again.");
      }
    });
  };

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      <section className="space-y-4 rounded-[1.5rem] border border-border bg-background/70 p-5">
        <div>
          <label htmlFor="organizationName" className="text-sm font-medium text-foreground">
            Organization name
          </label>
          <input
            id="organizationName"
            name="organizationName"
            type="text"
            required
            value={organizationName}
            onChange={(event) => setOrganizationName(event.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none transition-colors focus:border-[#b08968]"
            placeholder="Sunrise Student Council"
          />
        </div>

        <div>
          <label htmlFor="organizationSlug" className="text-sm font-medium text-foreground">
            Slug
          </label>
          <input
            id="organizationSlug"
            name="organizationSlug"
            type="text"
            required
            value={organizationSlug}
            onChange={(event) => setOrganizationSlug(event.target.value.toLowerCase())}
            className="mt-2 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none transition-colors focus:border-[#b08968]"
            placeholder="sunrise-student-council"
          />
        </div>

        <div>
          <label htmlFor="organizationDescription" className="text-sm font-medium text-foreground">
            Optional description
          </label>
          <textarea
            id="organizationDescription"
            name="organizationDescription"
            rows={3}
            value={organizationDescription}
            onChange={(event) => setOrganizationDescription(event.target.value)}
            className="mt-2 w-full resize-none rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-[#b08968]"
            placeholder="Describe your organization"
          />
        </div>
      </section>

      <section className="space-y-4 rounded-[1.5rem] border border-border bg-background/70 p-5">
        <div>
          <label htmlFor="superAdminName" className="text-sm font-medium text-foreground">
            Super admin name
          </label>
          <input
            id="superAdminName"
            name="superAdminName"
            type="text"
            required
            value={superAdminName}
            onChange={(event) => setSuperAdminName(event.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none transition-colors focus:border-[#b08968]"
            placeholder="Avery Johnson"
          />
        </div>

        <div>
          <label htmlFor="superAdminEmail" className="text-sm font-medium text-foreground">
            Super admin email
          </label>
          <input
            id="superAdminEmail"
            name="superAdminEmail"
            type="email"
            required
            value={superAdminEmail}
            onChange={(event) => setSuperAdminEmail(event.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none transition-colors focus:border-[#b08968]"
            placeholder="you@chapterhq.com"
          />
        </div>

        <div>
          <label htmlFor="superAdminPassword" className="text-sm font-medium text-foreground">
            Password
          </label>
          <input
            id="superAdminPassword"
            name="superAdminPassword"
            type="password"
            required
            value={superAdminPassword}
            onChange={(event) => setSuperAdminPassword(event.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none transition-colors focus:border-[#b08968]"
            placeholder="At least 8 characters"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none transition-colors focus:border-[#b08968]"
            placeholder="Repeat your password"
          />
        </div>
      </section>

      {errorMessage ? (
        <p className="rounded-xl border border-[#d9b6a2] bg-[#fdf3ec] px-3 py-2 text-sm text-[#8e4f31]">
          {errorMessage}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={isPending}
        className="h-11 w-full rounded-full bg-primary text-primary-foreground hover:bg-[#4a3228]"
      >
        {isPending ? "Creating workspace..." : "Create workspace"}
      </Button>
    </form>
  );
}
