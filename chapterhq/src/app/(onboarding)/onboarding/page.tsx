"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Step = "choice" | "create" | "join" | "done";

interface StepState {
  step: Step;
  orgName?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .slice(0, 48);
}

// ---------------------------------------------------------------------------
// Step 0 — Choice
// ---------------------------------------------------------------------------

function StepChoice({ onChoose }: { onChoose: (s: "create" | "join") => void }) {
  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-secondary-foreground">
          Get started
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-foreground">
          Set up your workspace
        </h1>
        <p className="mt-2 text-sm leading-6 text-secondary-foreground">
          Create a new organization or join an existing one with an invite link.
        </p>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => onChoose("create")}
          className="group flex w-full items-center gap-4 rounded-[1.5rem] border border-border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_12px_32px_rgba(77,54,37,0.1)]"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-background shadow-sm transition-colors group-hover:border-primary/30 group-hover:bg-primary/5">
            <Building2 className="h-5 w-5 text-primary" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              Create an organization
            </p>
            <p className="mt-0.5 text-xs text-secondary-foreground">
              Start fresh — you'll be the President
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-secondary-foreground transition-transform group-hover:translate-x-0.5" />
        </button>

        <button
          type="button"
          onClick={() => onChoose("join")}
          className="group flex w-full items-center gap-4 rounded-[1.5rem] border border-border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_12px_32px_rgba(77,54,37,0.1)]"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-background shadow-sm transition-colors group-hover:border-primary/30 group-hover:bg-primary/5">
            <Users className="h-5 w-5 text-primary" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              Join with an invite link
            </p>
            <p className="mt-0.5 text-xs text-secondary-foreground">
              Paste a token — your role is pre-assigned
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-secondary-foreground transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1a — Create Organization
// ---------------------------------------------------------------------------

function StepCreate({
  onBack,
  onDone,
}: {
  onBack: () => void;
  onDone: (orgName: string) => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const derivedSlug = slugTouched ? slug : slugify(name);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const finalSlug = derivedSlug.trim();
    if (!name.trim()) { setError("Organization name is required."); return; }
    if (!finalSlug) { setError("Slug is required."); return; }

    startTransition(async () => {
      try {
        const res = await fetch("/api/organizations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), slug: finalSlug }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data?.message ?? "Failed to create organization.");
          return;
        }

        onDone(name.trim());
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });
  };

  return (
    <div className="w-full max-w-md">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 flex items-center gap-1.5 text-sm text-secondary-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </button>

      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-secondary-foreground">
        New organization
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground">
        Name your organization
      </h2>
      <p className="mt-1.5 text-sm leading-6 text-secondary-foreground">
        You'll be assigned the President role automatically.
      </p>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="org-name"
            className="text-sm font-medium text-foreground"
          >
            Organization name
          </label>
          <input
            id="org-name"
            type="text"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Sunrise Student Council"
            className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-[#b08968] placeholder:text-secondary-foreground/50"
          />
        </div>

        <div>
          <label
            htmlFor="org-slug"
            className="text-sm font-medium text-foreground"
          >
            URL slug
          </label>
          <div className="mt-2 flex h-11 items-center overflow-hidden rounded-xl border border-border bg-background transition-colors focus-within:border-[#b08968]">
            <span className="pl-3 text-sm text-secondary-foreground select-none">
              /
            </span>
            <input
              id="org-slug"
              type="text"
              value={derivedSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              placeholder="sunrise-student-council"
              className="flex-1 bg-transparent px-1.5 text-sm text-foreground outline-none placeholder:text-secondary-foreground/50"
            />
          </div>
          <p className="mt-1 text-xs text-secondary-foreground">
            Only letters, numbers, hyphens, underscores.
          </p>
        </div>

        {error && (
          <p className="rounded-xl border border-[#d9b6a2] bg-[#fdf3ec] px-3 py-2 text-sm text-[#8e4f31]">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={isPending}
          className="h-11 w-full rounded-full bg-primary text-primary-foreground hover:bg-[#4a3228]"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating…
            </span>
          ) : (
            "Create organization"
          )}
        </Button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1b — Join via Invite Token
// ---------------------------------------------------------------------------

function StepJoin({
  onBack,
  onDone,
}: {
  onBack: () => void;
  onDone: (orgName: string) => void;
}) {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token.trim()) {
      setError("Please paste your invitation token.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/invitations/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: token.trim() }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data?.message ?? "Failed to accept invitation.");
          return;
        }

        onDone("your organization");
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });
  };

  return (
    <div className="w-full max-w-md">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 flex items-center gap-1.5 text-sm text-secondary-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </button>

      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-secondary-foreground">
        Join organization
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground">
        Enter your invite token
      </h2>
      <p className="mt-1.5 text-sm leading-6 text-secondary-foreground">
        Ask your organization admin for an invite token. Your role will be
        assigned automatically.
      </p>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="invite-token"
            className="text-sm font-medium text-foreground"
          >
            Invitation token
          </label>
          <textarea
            id="invite-token"
            rows={3}
            required
            autoFocus
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste the invitation token here…"
            className="mt-2 w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-[#b08968] placeholder:text-secondary-foreground/50"
          />
        </div>

        {error && (
          <p className="rounded-xl border border-[#d9b6a2] bg-[#fdf3ec] px-3 py-2 text-sm text-[#8e4f31]">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={isPending}
          className="h-11 w-full rounded-full bg-primary text-primary-foreground hover:bg-[#4a3228]"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Joining…
            </span>
          ) : (
            "Accept invitation"
          )}
        </Button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Done / Redirect
// ---------------------------------------------------------------------------

function StepDone({ orgName }: { orgName: string }) {
  const router = useRouter();

  // Auto-redirect after a short celebration pause
  useState(() => {
    const id = setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 2200);
    return () => clearTimeout(id);
  });

  return (
    <div className="flex w-full max-w-sm flex-col items-center text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 shadow-[0_12px_30px_rgba(16,185,129,0.12)]">
        <CheckCircle2 className="h-9 w-9 text-emerald-600" />
      </span>

      <h2 className="mt-6 text-2xl font-semibold tracking-[-0.04em] text-foreground">
        You're all set!
      </h2>
      <p className="mt-2 text-sm leading-6 text-secondary-foreground">
        Welcome to{" "}
        <span className="font-semibold text-foreground">{orgName}</span>.
        Taking you to your dashboard…
      </p>

      <div className="mt-8 flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm text-secondary-foreground">Redirecting…</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root page — state machine
// ---------------------------------------------------------------------------

export default function OnboardingPage() {
  const [state, setState] = useState<StepState>({ step: "choice" });

  const go = (step: Step, extra?: Partial<StepState>) =>
    setState((prev) => ({ ...prev, step, ...extra }));

  return (
    <section
      className={cn(
        "w-full transition-all duration-300",
        "flex items-center justify-center"
      )}
    >
      {state.step === "choice" && (
        <StepChoice
          onChoose={(path) => go(path)}
        />
      )}

      {state.step === "create" && (
        <StepCreate
          onBack={() => go("choice")}
          onDone={(orgName) => go("done", { orgName })}
        />
      )}

      {state.step === "join" && (
        <StepJoin
          onBack={() => go("choice")}
          onDone={(orgName) => go("done", { orgName })}
        />
      )}

      {state.step === "done" && (
        <StepDone orgName={state.orgName ?? "your organization"} />
      )}
    </section>
  );
}
