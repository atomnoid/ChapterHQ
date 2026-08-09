"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, Crown, Loader2, Plus, ShieldOff, Trash2, UserCheck, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AssignMemberDialog, Committee } from "./committee-dialogs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CommitteeMemberItem {
  id: string;
  assignedAt: string;
  member: {
    id: string;
    status: string;
    user: { id: string; name: string | null; email: string | null; image: string | null };
  };
}

interface AppointmentItem {
  id: string;
  designation: string;
  startDate: string;
  endDate: string | null;
  status: string;
  member: {
    id: string;
    user: { name: string | null; email: string | null };
  };
}

// ---------------------------------------------------------------------------
// Assign Head sub-dialog
// This posts to POST /api/appointments with designation = "Committee Head".
// committeeId comes only from the trusted committee prop (never from the user).
// The member list is scoped to this committee's actual members.
// ---------------------------------------------------------------------------

function AssignHeadDialog({
  committee,
  committeeMembers,
  open,
  onOpenChange,
  onSuccess,
}: {
  committee: Committee;
  committeeMembers: CommitteeMemberItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedMemberId("");
      setStartDate(new Date().toISOString().slice(0, 10));
      setError(null);
    }
  }, [open]);

  async function handleAssign() {
    if (!selectedMemberId || !startDate) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // committeeId is sourced from the server-verified committee prop, not user input.
          committeeId: committee.id,
          memberId: selectedMemberId,
          designation: "Committee Head",
          startDate,
          status: "ACTIVE",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message ?? "Failed to assign Committee Head.");
        return;
      }
      onOpenChange(false);
      onSuccess();
    } catch {
      setError("An error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Crown className="h-5 w-5 text-primary" />
            </span>
            <DialogTitle>Assign Committee Head</DialogTitle>
          </div>
          <DialogDescription>
            Select a committee member to appoint as Head of <strong>{committee.name}</strong>.
            This grants them committee-management authority.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="head-member-select">Select Member</Label>
            <select
              id="head-member-select"
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="flex h-11 w-full rounded-2xl border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">-- Choose a committee member --</option>
              {committeeMembers.map((cm) => (
                <option key={cm.member.id} value={cm.member.id}>
                  {cm.member.user.name ?? cm.member.user.email ?? cm.member.id}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="head-start-date">Appointment Start Date</Label>
            <input
              id="head-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex h-11 w-full rounded-2xl border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && (
            <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            className="rounded-full"
            onClick={handleAssign}
            disabled={submitting || !selectedMemberId || !startDate}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Appoint as Head
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// CommitteeDetailsModal
// ---------------------------------------------------------------------------

export function CommitteeDetailsModal({
  committee,
  open,
  onOpenChange,
}: {
  committee: Committee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [activeTab, setActiveTab] = useState<"members" | "appointments">("members");

  // Members state
  const [members, setMembers] = useState<CommitteeMemberItem[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  // Appointments state
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Assign dialogs
  const [assignMemberOpen, setAssignMemberOpen] = useState(false);
  const [assignHeadOpen, setAssignHeadOpen] = useState(false);

  const fetchCommitteeMembers = useCallback(async () => {
    if (!committee) return;
    await Promise.resolve();
    setLoadingMembers(true);
    try {
      const res = await fetch(`/api/committees/${committee.id}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(Array.isArray(data) ? data : data.items ?? []);
      }
    } catch {
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }, [committee]);

  const fetchAppointments = useCallback(async () => {
    if (!committee) return;
    await Promise.resolve();
    setLoadingAppointments(true);
    try {
      // Note: the server ignores the query-param committeeId when
      // activeCommitteeId is set in the session (Phase 4 isolation).
      // For the President/org-wide view this param scopes the display correctly.
      const res = await fetch(`/api/appointments?committeeId=${committee.id}`);
      if (res.ok) {
        const data = await res.json();
        setAppointments(Array.isArray(data) ? data : data.items ?? []);
      }
    } catch {
      setAppointments([]);
    } finally {
      setLoadingAppointments(false);
    }
  }, [committee]);

  useEffect(() => {
    if (open && committee) {
      fetchCommitteeMembers();
      fetchAppointments();
    }
  }, [open, committee, fetchCommitteeMembers, fetchAppointments]);

  async function handleRemoveMember(memberId: string) {
    if (!committee) return;
    setRemovingMemberId(memberId);
    try {
      const res = await fetch(`/api/committees/${committee.id}/members/${memberId}`, {
        method: "DELETE",
      });
      if (res.ok) fetchCommitteeMembers();
    } finally {
      setRemovingMemberId(null);
    }
  }

  async function handleRevokeAppointment(appointmentId: string) {
    setRevokingId(appointmentId);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REVOKED" }),
      });
      if (res.ok) fetchAppointments();
    } finally {
      setRevokingId(null);
    }
  }

  if (!committee) return null;

  const isHead = (app: AppointmentItem) =>
    ["Committee Head", "Head", "Chairman", "Chair", "Committee Lead", "Lead"].includes(
      app.designation
    );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{committee.name}</DialogTitle>
            <DialogDescription>
              {committee.description ?? "No description provided."}
            </DialogDescription>
          </DialogHeader>

          {/* Navigation Tabs */}
          <div className="flex border-b border-border gap-4 mt-2">
            <button
              onClick={() => setActiveTab("members")}
              className={`pb-2.5 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 ${
                activeTab === "members"
                  ? "border-primary text-foreground"
                  : "border-transparent text-secondary-foreground hover:text-foreground"
              }`}
            >
              <Users className="h-4 w-4" />
              Members ({members.length})
            </button>
            <button
              onClick={() => setActiveTab("appointments")}
              className={`pb-2.5 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 ${
                activeTab === "appointments"
                  ? "border-primary text-foreground"
                  : "border-transparent text-secondary-foreground hover:text-foreground"
              }`}
            >
              <UserCheck className="h-4 w-4" />
              Leadership ({appointments.length})
            </button>
          </div>

          {/* Tab Contents */}
          <div className="flex-1 overflow-y-auto py-4 min-h-[250px]">
            {/* Members Tab */}
            {activeTab === "members" && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="rounded-full gap-1.5"
                    onClick={() => setAssignMemberOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5" /> Assign Member
                  </Button>
                </div>

                {loadingMembers ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 animate-pulse rounded-2xl bg-secondary/50" />
                    ))}
                  </div>
                ) : members.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-border rounded-2xl">
                    <p className="text-sm text-secondary-foreground">
                      No members assigned to this committee yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {members.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-2xl border border-border bg-card hover:bg-secondary/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                            {(item.member.user.name ?? item.member.user.email ?? "?")[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {item.member.user.name ?? "Unnamed"}
                            </p>
                            <p className="text-xs text-secondary-foreground truncate">
                              {item.member.user.email}
                            </p>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-full"
                          onClick={() => handleRemoveMember(item.member.id)}
                          disabled={removingMemberId === item.member.id}
                        >
                          {removingMemberId === item.member.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Appointments / Leadership Tab */}
            {activeTab === "appointments" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-secondary-foreground">
                    Manage committee leadership appointments.
                  </p>
                  <Button
                    size="sm"
                    className="rounded-full gap-1.5"
                    onClick={() => setAssignHeadOpen(true)}
                    disabled={members.length === 0}
                  >
                    <Crown className="h-3.5 w-3.5" /> Assign Head
                  </Button>
                </div>

                {loadingAppointments ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-14 animate-pulse rounded-2xl bg-secondary/50" />
                    ))}
                  </div>
                ) : appointments.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-border rounded-2xl">
                    <p className="text-sm text-secondary-foreground">
                      No leadership appointments found for this committee.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {appointments.map((app) => (
                      <div
                        key={app.id}
                        className="flex items-center justify-between p-3 rounded-2xl border border-border bg-card"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {isHead(app) && (
                            <Crown className="h-4 w-4 shrink-0 text-primary" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">
                              {app.designation}
                            </p>
                            <p className="text-xs text-secondary-foreground truncate">
                              {app.member.user.name ?? app.member.user.email}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 text-xs text-secondary-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{new Date(app.startDate).toLocaleDateString()}</span>
                          </div>

                          {/* Status badge */}
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              app.status === "ACTIVE"
                                ? "bg-emerald-100 text-emerald-700"
                                : app.status === "REVOKED"
                                ? "bg-destructive/10 text-destructive"
                                : "bg-secondary text-secondary-foreground"
                            }`}
                          >
                            {app.status}
                          </span>

                          {/* Revoke button — only for ACTIVE appointments */}
                          {app.status === "ACTIVE" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-full shrink-0"
                              title="Revoke appointment"
                              onClick={() => handleRevokeAppointment(app.id)}
                              disabled={revokingId === app.id}
                            >
                              {revokingId === app.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <ShieldOff className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Nested: Assign Member dialog */}
      <AssignMemberDialog
        committeeId={committee.id}
        open={assignMemberOpen}
        onOpenChange={setAssignMemberOpen}
        onSuccess={fetchCommitteeMembers}
      />

      {/* Nested: Assign Head dialog */}
      <AssignHeadDialog
        committee={committee}
        committeeMembers={members}
        open={assignHeadOpen}
        onOpenChange={setAssignHeadOpen}
        onSuccess={() => {
          fetchAppointments();
          setActiveTab("appointments");
        }}
      />
    </>
  );
}
