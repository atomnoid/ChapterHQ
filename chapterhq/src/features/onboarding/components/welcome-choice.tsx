"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Building2, Users, ArrowRight, Loader2, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type View = "choice" | "create" | "join";

// ─── Create-Organization sub-form ─────────────────────────────────────────────
function CreateOrgForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const { update } = useSession();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function deriveSlug(val: string) {
    return val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function handleNameChange(val: string) {
    setName(val);
    setSlug(deriveSlug(val));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/organizations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), slug, description: description || undefined }),
        });

        const json = await res.json() as { message?: string; data?: { id: string } };

        if (!res.ok) {
          setError(json.message ?? "Could not create organization.");
          return;
        }

        // Switch session to the new organization
        const newOrgId = json.data?.id;
        if (newOrgId) {
          await update({ activeOrganizationId: newOrgId });
        }

        window.location.href = "/dashboard";
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });
  }

  return (
    <div className="mt-8 rounded-[1.75rem] border border-border bg-card p-6 sm:p-8 shadow-[0_20px_60px_rgba(77,54,37,0.08)]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Create organization</h2>
          <p className="mt-1 text-sm text-secondary-foreground">Set up your new workspace.</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          disabled={isPending}
          className="rounded-full p-1.5 text-secondary-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Back"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="org-name" className="text-sm font-medium text-foreground">
            Organization name <span className="text-destructive">*</span>
          </label>
          <input
            id="org-name"
            type="text"
            required
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-[#b08968]"
            placeholder="e.g. Alpha Phi Society"
          />
        </div>

        <div>
          <label htmlFor="org-slug" className="text-sm font-medium text-foreground">
            URL slug <span className="text-destructive">*</span>
          </label>
          <div className="mt-2 flex items-center gap-2">
            <span className="shrink-0 text-sm text-secondary-foreground">chapterhq.io/</span>
            <input
              id="org-slug"
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(deriveSlug(e.target.value))}
              pattern="[a-z0-9-]+"
              minLength={2}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-[#b08968]"
              placeholder="alpha-phi-society"
            />
          </div>
          <p className="mt-1 text-xs text-secondary-foreground">Lowercase letters, numbers, and hyphens only.</p>
        </div>

        <div>
          <label htmlFor="org-desc" className="text-sm font-medium text-foreground">
            Description <span className="text-secondary-foreground font-normal">(optional)</span>
          </label>
          <textarea
            id="org-desc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-2 w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-[#b08968]"
            placeholder="Brief description of your organization"
          />
        </div>

        {error && (
          <p className="rounded-xl border border-[#d9b6a2] bg-[#fdf3ec] px-3 py-2 text-sm text-[#8e4f31]">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={isPending || !name.trim() || !slug}
          className="h-11 w-full rounded-full bg-primary text-primary-foreground hover:bg-[#4a3228]"
        >
          {isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating…</>
          ) : (
            "Create organization"
          )}
        </Button>
      </form>
    </div>
  );
}

// ─── Join-via-invitation sub-form ─────────────────────────────────────────────
function JoinOrgForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const { update } = useSession();

  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/invitations/accept?token=${encodeURIComponent(token.trim())}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "accept" }),
        });

        const json = await res.json() as {
          message?: string;
          activeOrganizationId?: string;
          activeCommitteeId?: string | null;
          alreadyAccepted?: boolean;
        };

        if (!res.ok) {
          setError(json.message ?? "Could not accept invitation.");
          return;
        }

        // Update session with the joined organization
        const newOrgId = json.activeOrganizationId;
        if (newOrgId) {
          await update({ activeOrganizationId: newOrgId });
        }

        setSuccess(true);
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1200);
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });
  }

  return (
    <div className="mt-8 rounded-[1.75rem] border border-border bg-card p-6 sm:p-8 shadow-[0_20px_60px_rgba(77,54,37,0.08)]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Join organization</h2>
          <p className="mt-1 text-sm text-secondary-foreground">
            Enter the invitation code sent to your email.
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          disabled={isPending}
          className="rounded-full p-1.5 text-secondary-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Back"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {success ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 className="h-10 w-10 text-primary" />
          <p className="text-sm font-medium text-foreground">Invitation accepted! Redirecting…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="invite-token" className="text-sm font-medium text-foreground">
              Invitation token <span className="text-destructive">*</span>
            </label>
            <input
              id="invite-token"
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground font-mono outline-none transition-colors focus:border-[#b08968]"
              placeholder="Paste your invitation token here"
            />
            <p className="mt-1 text-xs text-secondary-foreground">
              The token is included in your invitation email link.
            </p>
          </div>

          {error && (
            <p className="rounded-xl border border-[#d9b6a2] bg-[#fdf3ec] px-3 py-2 text-sm text-[#8e4f31]">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={isPending || !token.trim()}
            className="h-11 w-full rounded-full bg-primary text-primary-foreground hover:bg-[#4a3228]"
          >
            {isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Joining…</>
            ) : (
              "Accept invitation"
            )}
          </Button>
        </form>
      )}
    </div>
  );
}

// ─── Main choice screen ────────────────────────────────────────────────────────
export function WelcomeChoice() {
  const [view, setView] = useState<View>("choice");

  if (view === "create") return <CreateOrgForm onBack={() => setView("choice")} />;
  if (view === "join") return <JoinOrgForm onBack={() => setView("choice")} />;

  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2">
      {/* Create organization card */}
      <button
        id="welcome-create-org"
        type="button"
        onClick={() => setView("create")}
        className="group relative flex flex-col items-start gap-4 rounded-[1.75rem] border border-border bg-card p-6 text-left shadow-[0_8px_30px_rgba(77,54,37,0.06)] transition-all hover:border-primary/40 hover:shadow-[0_12px_40px_rgba(77,54,37,0.12)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
          <Building2 className="h-6 w-6" />
        </span>

        <div className="flex-1">
          <h2 className="text-base font-semibold text-foreground">Create organization</h2>
          <p className="mt-1 text-sm leading-5 text-secondary-foreground">
            Start fresh. Set up your chapter or organization and become its President.
          </p>
        </div>

        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-secondary-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <ArrowRight className="h-4 w-4" />
        </span>
      </button>

      {/* Join organization card */}
      <button
        id="welcome-join-org"
        type="button"
        onClick={() => setView("join")}
        className="group relative flex flex-col items-start gap-4 rounded-[1.75rem] border border-border bg-card p-6 text-left shadow-[0_8px_30px_rgba(77,54,37,0.06)] transition-all hover:border-primary/40 hover:shadow-[0_12px_40px_rgba(77,54,37,0.12)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
          <Users className="h-6 w-6" />
        </span>

        <div className="flex-1">
          <h2 className="text-base font-semibold text-foreground">Join organization</h2>
          <p className="mt-1 text-sm leading-5 text-secondary-foreground">
            Accept an invitation to join an existing organization or committee.
          </p>
        </div>

        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-secondary-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <ArrowRight className="h-4 w-4" />
        </span>
      </button>
    </div>
  );
}
