"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, Loader2, Plus, Trash2, UserCheck, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AssignMemberDialog, Committee } from "./committee-dialogs";

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
    user: { name: string | null; email: string | null };
  };
}

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

  // Assign dialog state
  const [assignOpen, setAssignOpen] = useState(false);

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
    } catch (_err) {
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
      const res = await fetch(`/api/appointments?committeeId=${committee.id}`);
      if (res.ok) {
        const data = await res.json();
        setAppointments(Array.isArray(data) ? data : data.items ?? []);
      }
    } catch (_err) {
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
      if (res.ok) {
        fetchCommitteeMembers();
      }
    } finally {
      setRemovingMemberId(null);
    }
  }

  if (!committee) return null;

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
              Appointments ({appointments.length})
            </button>
          </div>

          {/* Tab Contents */}
          <div className="flex-1 overflow-y-auto py-4 min-h-[250px]">
            {/* Members Tab */}
            {activeTab === "members" && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button size="sm" className="rounded-full gap-1.5" onClick={() => setAssignOpen(true)}>
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
                    <p className="text-sm text-secondary-foreground">No members assigned to this committee yet.</p>
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

            {/* Appointments Tab */}
            {activeTab === "appointments" && (
              <div className="space-y-4">
                {loadingAppointments ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-14 animate-pulse rounded-2xl bg-secondary/50" />
                    ))}
                  </div>
                ) : appointments.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-border rounded-2xl">
                    <p className="text-sm text-secondary-foreground">No leadership appointments found for this committee.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {appointments.map((app) => (
                      <div
                        key={app.id}
                        className="flex items-center justify-between p-3 rounded-2xl border border-border bg-card"
                      >
                        <div>
                          <p className="text-sm font-semibold text-foreground">{app.designation}</p>
                          <p className="text-xs text-secondary-foreground">
                            {app.member.user.name ?? app.member.user.email}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-secondary-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{new Date(app.startDate).toLocaleDateString()}</span>
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

      {/* Nested Assign Dialog */}
      <AssignMemberDialog
        committeeId={committee.id}
        open={assignOpen}
        onOpenChange={setAssignOpen}
        onSuccess={() => {
          fetchCommitteeMembers();
        }}
      />
    </>
  );
}
