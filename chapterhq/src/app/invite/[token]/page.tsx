"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { AlertTriangle, CheckCircle, Loader2, Mail, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InvitationDetail {
  id: string;
  email: string;
  expiresAt: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED";
  organization: {
    name: string;
  };
}

interface RoleDetail {
  name: string;
}

export default function InviteTokenPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<InvitationDetail | null>(null);
  const [role, setRole] = useState<RoleDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // 1. Redirect to login if unauthenticated (run in useEffect, not in render)
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      const callbackUrl = encodeURIComponent(window.location.pathname);
      router.replace(`/login?callbackUrl=${callbackUrl}`);
    }
  }, [sessionStatus, router]);

  // 2. Fetch invitation details
  useEffect(() => {
    if (!token) return;

    fetch(`/api/invitations/accept?token=${token}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Invitation not found or has been revoked.");
        }
        return res.json();
      })
      .then((data) => {
        setInvitation(data.invitation);
        setRole(data.role);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  // 3. Redirect to dashboard if invitation is already accepted
  useEffect(() => {
    if (invitation && invitation.status === "ACCEPTED") {
      router.replace("/dashboard");
    }
  }, [invitation, router]);

  const handleAction = (action: "accept" | "reject") => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/invitations/accept?token=${token}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.message || "Failed to process invitation request.");
          return;
        }

        if (action === "accept") {
          router.push("/dashboard");
          router.refresh();
        } else {
          router.push("/");
        }
      } catch (err) {
        setError("An unexpected error occurred. Please try again.");
      }
    });
  };

  // Show loading while session or invitation is loading
  if (sessionStatus === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-secondary-foreground">Loading invitation details...</p>
        </div>
      </div>
    );
  }

  // Prevent rendering if user is not authenticated (the redirect useEffect will handle navigation)
  if (!session) {
    return null;
  }

  // If already accepted, return null (the redirect useEffect will send the user to the dashboard)
  if (invitation && invitation.status === "ACCEPTED") {
    return null;
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <section className="w-full max-w-md rounded-[1.75rem] border border-border bg-card p-8 text-center shadow-[0_20px_60px_rgba(77,54,37,0.08)]">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert className="h-6 w-6" />
          </span>
          <h1 className="mt-6 text-2xl font-bold tracking-[-0.04em]">Invalid Invitation</h1>
          <p className="mt-2 text-sm text-secondary-foreground">{error}</p>
          <Link href="/">
            <Button className="mt-8 h-11 w-full rounded-full bg-primary text-primary-foreground hover:bg-[#4a3228]">
              Back to Home
            </Button>
          </Link>
        </section>
      </main>
    );
  }

  if (!invitation) return null;

  const isExpired = new Date() > new Date(invitation.expiresAt) || invitation.status === "EXPIRED";
  const loggedInEmail = session.user.email?.toLowerCase();
  const invitedEmail = invitation.email.toLowerCase();

  // Email mismatch check
  if (loggedInEmail && loggedInEmail !== invitedEmail) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <section className="w-full max-w-md rounded-[1.75rem] border border-border bg-card p-8 text-center shadow-[0_20px_60px_rgba(77,54,37,0.08)]">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </span>
          <h1 className="mt-6 text-xl font-bold tracking-[-0.04em]">Email Mismatch</h1>
          <p className="mt-3 text-sm text-secondary-foreground">
            This invitation was sent to <strong className="text-foreground">{invitation.email}</strong>, but you are logged in as <strong className="text-foreground">{session.user.email}</strong>.
          </p>
          <p className="mt-2 text-xs text-secondary-foreground">
            Please log out and sign in with the correct account to accept this invitation.
          </p>
          <div className="mt-8 space-y-3">
            <Link href="/login" className="block">
              <Button variant="outline" className="h-11 w-full rounded-full">
                Switch Account
              </Button>
            </Link>
          </div>
        </section>
      </main>
    );
  }

  // Expired invitation error page
  if (isExpired) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <section className="w-full max-w-md rounded-[1.75rem] border border-border bg-card p-8 text-center shadow-[0_20px_60px_rgba(77,54,37,0.08)]">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert className="h-6 w-6" />
          </span>
          <h1 className="mt-6 text-2xl font-bold tracking-[-0.04em]">Invitation Expired</h1>
          <p className="mt-2 text-sm text-secondary-foreground">
            This invitation expired on {new Date(invitation.expiresAt).toLocaleDateString()}. Please request the Super Admin to resend the invitation.
          </p>
          <Link href="/">
            <Button className="mt-8 h-11 w-full rounded-full bg-primary text-primary-foreground hover:bg-[#4a3228]">
              Back to Home
            </Button>
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f8f4ec_0%,#fbf8f2_40%,#f8f4ec_100%)] px-4 py-12">
      <section className="w-full max-w-md rounded-[1.75rem] border border-border bg-card p-7 shadow-[0_20px_60px_rgba(77,54,37,0.08)] sm:p-8">
        <div className="text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-background shadow-sm">
            <Mail className="h-7 w-7 text-primary" />
          </span>
          <h1 className="mt-6 text-2xl font-bold tracking-[-0.04em] text-foreground">
            Join {invitation.organization.name}
          </h1>
          <p className="mt-2 text-sm text-secondary-foreground">
            You have been invited to join the organization on ChapterHQ.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-[#fcf8f1] p-4 space-y-3.5 text-sm">
          <div className="flex justify-between">
            <span className="text-secondary-foreground font-medium">Invited Email</span>
            <span className="text-foreground font-semibold truncate max-w-[200px]">{invitation.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary-foreground font-medium">Assigned Role</span>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {role?.name || "Volunteer"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary-foreground font-medium">Expires At</span>
            <span className="text-foreground font-semibold">
              {new Date(invitation.expiresAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-[#d9b6a2] bg-[#fdf3ec] px-3 py-2 text-sm text-[#8e4f31]">
            {error}
          </p>
        )}

        <div className="mt-8 grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => handleAction("reject")}
            className="h-11 rounded-full border-border text-foreground hover:bg-secondary"
          >
            Reject
          </Button>
          <Button
            type="button"
            disabled={isPending}
            onClick={() => handleAction("accept")}
            className="h-11 rounded-full bg-primary text-primary-foreground hover:bg-[#4a3228]"
          >
            {isPending ? (
              <span className="flex items-center gap-2 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
                Accepting...
              </span>
            ) : (
              "Accept"
            )}
          </Button>
        </div>
      </section>
    </main>
  );
}
