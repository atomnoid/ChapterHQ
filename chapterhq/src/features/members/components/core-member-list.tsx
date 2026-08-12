"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useTransition } from "react";
import { ShieldAlert, UserPlus, Shield, User, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddCoreMemberDialog } from "./add-core-member-dialog";
import { RemoveCoreMemberDialog } from "./remove-core-member-dialog";

interface CoreMemberRecord {
  id: string;
  note: string | null;
  addedAt: string;
  member: {
    id: string;
    user: {
      name: string | null;
      email: string | null;
      image: string | null;
    };
    userRoles: {
      role: { name: string };
    }[];
    committeeMembers: {
      committee: { name: string };
    }[];
    appointments: {
      designation: string;
      committee: { name: string };
    }[];
  };
}

export function CoreMemberList() {
  const [records, setRecords] = useState<CoreMemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedRecordName, setSelectedRecordName] = useState("");

  function fetchRecords() {
    setLoading(true);
    fetch("/api/core-members")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch core members.");
        return r.json();
      })
      .then((data) => {
        setRecords(data);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchRecords();
  }, []);

  function triggerRemove(id: string, name: string) {
    setSelectedRecordId(id);
    setSelectedRecordName(name);
    setRemoveDialogOpen(true);
  }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center text-destructive">
        <p className="text-sm font-medium">{error}</p>
        <Button onClick={fetchRecords} variant="outline" className="mt-4 rounded-full">
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-secondary-foreground">
            View organization administrators, committee leaders, and manually designated members.
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="rounded-full bg-primary text-primary-foreground hover:bg-[#4a3228]">
          <UserPlus className="mr-2 h-4 w-4" /> Designate Core Member
        </Button>
      </div>

      {records.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground/60" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">No Core Members</h3>
          <p className="mt-2 text-sm text-secondary-foreground max-w-sm mx-auto">
            Designate important or high-permission members as Core Members to highlight leadership.
          </p>
          <Button onClick={() => setAddDialogOpen(true)} className="mt-6 rounded-full" variant="outline">
            Designate member
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-foreground">
            <thead>
              <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-secondary-foreground">
                <th className="py-4 pl-4 pr-3">Name</th>
                <th className="py-4 px-3">Role</th>
                <th className="py-4 px-3">Committee & Appointment</th>
                <th className="py-4 px-3">Status / Note</th>
                <th className="py-4 pl-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {records.map((record) => {
                const userName = record.member.user.name ?? record.member.user.email ?? "Unknown Name";
                const isPresident = record.member.userRoles.some((ur) => ur.role.name === "Admin" || ur.role.name === "President");
                const activeAppointments = record.member.appointments;
                const hasAppointments = activeAppointments.length > 0;

                return (
                  <tr key={record.id} className="hover:bg-accent/30 transition-colors">
                    <td className="py-4 pl-4 pr-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-medium text-primary">
                          {userName[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{userName}</p>
                          <p className="text-xs text-secondary-foreground">{record.member.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-3">
                      <div className="flex flex-wrap gap-1">
                        {record.member.userRoles.map((ur, idx) => (
                          <span key={idx} className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                            {ur.role.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-3">
                      {isPresident ? (
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                          Organization-wide Head
                        </span>
                      ) : hasAppointments ? (
                        <div className="space-y-1">
                          {activeAppointments.map((app, idx) => (
                            <div key={idx} className="text-xs">
                              <span className="font-medium text-foreground">{app.designation}</span>
                              <span className="text-secondary-foreground"> ({app.committee.name})</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-secondary-foreground">—</span>
                      )}
                    </td>
                    <td className="py-4 px-3">
                      <div className="space-y-1">
                        <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-700">
                          Core Member
                        </span>
                        {record.note && (
                          <p className="text-xs text-secondary-foreground italic">{record.note}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-4 pl-3 pr-4 text-right">
                      <Button
                        onClick={() => triggerRemove(record.id, userName)}
                        variant="ghost"
                        size="sm"
                        className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AddCoreMemberDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} onSuccess={fetchRecords} />
      <RemoveCoreMemberDialog coreMemberId={selectedRecordId} coreMemberName={selectedRecordName} open={removeDialogOpen} onOpenChange={setRemoveDialogOpen} onSuccess={fetchRecords} />
    </div>
  );
}
