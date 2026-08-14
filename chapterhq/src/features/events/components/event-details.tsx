"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  XCircle,
  Percent,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  UserCheck,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AttendanceList } from "@/features/attendance/components/attendance-list";

interface Event {
  id: string;
  title: string;
  description: string | null;
  venue: string | null;
  startDate: string;
  endDate: string | null;
  capacity: number | null;
  registrationRequired: boolean;
  status: string;
}

interface Registration {
  id: string;
  eventId: string;
  memberId: string;
  status: string;
  registeredAt: string;
  member: {
    id: string;
    user: {
      name: string | null;
      email: string | null;
      image: string | null;
    };
  };
}

interface OrgMember {
  id: string;
  user: {
    name: string | null;
    email: string | null;
  };
}

interface AttendanceRecord {
  id: string;
  status: string;
}

interface EventDetailsProps {
  eventId: string;
}

export function EventDetails({ eventId }: EventDetailsProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [allMembers, setAllMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "attendees" | "attendance" | "statistics">("overview");

  // Search & add new attendee variables
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMemberToAdd, setSelectedMemberToAdd] = useState("");
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [selectedRegIds, setSelectedRegIds] = useState<string[]>([]);
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedAddMemberIds, setSelectedAddMemberIds] = useState<string[]>([]);
  const [addSearchQuery, setAddSearchQuery] = useState("");

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [eventRes, regRes, attRes, membersRes] = await Promise.all([
        fetch(`/api/events/${eventId}`),
        fetch(`/api/events/${eventId}/registrations?limit=100`),
        fetch(`/api/events/${eventId}/attendance`),
        fetch("/api/members?limit=100"),
      ]);

      if (!eventRes.ok || !regRes.ok || !attRes.ok || !membersRes.ok) {
        throw new Error("Failed to load event details.");
      }

      const eventJson = await eventRes.json();
      const regJson = await regRes.json();
      const attJson = await attRes.json();
      const membersJson = await membersRes.json();

      setEvent(eventJson?.data ?? eventJson);
      setRegistrations(regJson?.data?.items ?? regJson?.items ?? []);
      setAttendance(attJson?.data ?? attJson ?? []);
      setAllMembers(membersJson?.items ?? membersJson?.data?.items ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch details.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Handle adding member registration
  async function handleRegisterMember(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMemberToAdd) return;
    setRegistering(true);
    setRegisterError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: selectedMemberToAdd }),
      });
      const json = await res.json();
      if (!res.ok) {
        setRegisterError(json.message ?? "Failed to register member.");
        return;
      }
      setSelectedMemberToAdd("");
      await fetchDetails();
    } catch {
      setRegisterError("An error occurred during registration.");
    } finally {
      setRegistering(false);
    }
  }

  // Handle bulk adding member registrations
  async function handleBulkRegisterMembers() {
    if (selectedAddMemberIds.length === 0) return;
    setRegistering(true);
    setRegisterError(null);
    try {
      let succeededCount = 0;
      let lastError = null;
      for (const memberId of selectedAddMemberIds) {
        try {
          const res = await fetch(`/api/events/${eventId}/registrations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ memberId }),
          });
          if (!res.ok) {
            const json = await res.json();
            lastError = json.message ?? `Failed to register member.`;
          } else {
            succeededCount++;
          }
        } catch {
          lastError = "An error occurred during registration.";
        }
      }
      setSelectedAddMemberIds([]);
      setAddSearchQuery("");
      setIsAddDialogOpen(false);
      await fetchDetails();
      if (lastError && succeededCount === 0) {
        setRegisterError(lastError);
      } else if (lastError) {
        alert(`Registered ${succeededCount} member(s). Some registrations failed: ${lastError}`);
      }
    } catch {
      setRegisterError("An error occurred during registration.");
    } finally {
      setRegistering(false);
    }
  }

  // Handle removing member registration
  async function handleCancelRegistration(memberId: string) {
    if (!confirm("Are you sure you want to remove this member from the attendee list?")) return;
    try {
      const res = await fetch(`/api/events/${eventId}/registrations/${memberId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json();
        alert(json.message ?? "Failed to remove attendee.");
        return;
      }
      await fetchDetails();
    } catch {
      alert("An unexpected error occurred.");
    }
  }

  // Handle bulk deletion
  async function handleBulkDeleteRegistrations() {
    if (selectedRegIds.length === 0) return;
    if (!confirm(`Are you sure you want to remove ${selectedRegIds.length} member(s) from the attendee list? This cannot be undone.`)) return;
    
    setDeletingBulk(true);
    try {
      for (const regId of selectedRegIds) {
        const reg = registrations.find((r) => r.id === regId);
        if (!reg) continue;
        const res = await fetch(`/api/events/${eventId}/registrations/${reg.memberId}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const json = await res.json();
          alert(json.message ?? "Failed to remove some attendees.");
          break;
        }
      }
      setSelectedRegIds([]);
      await fetchDetails();
    } catch {
      alert("An unexpected error occurred during bulk deletion.");
    } finally {
      setDeletingBulk(false);
    }
  }

  // Handle checkbox selection
  const handleSelectReg = (regId: string) => {
    setSelectedRegIds((prev) =>
      prev.includes(regId) ? prev.filter((id) => id !== regId) : [...prev, regId]
    );
  };

  // Handle select all
  const handleSelectAllRegs = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRegIds(filteredRegistrations.map((r) => r.id));
    } else {
      setSelectedRegIds([]);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-secondary-foreground">Loading event details...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="rounded-2xl bg-destructive/5 border border-border px-5 py-6 text-center max-w-md mx-auto my-12">
        <p className="text-sm font-medium text-destructive">{error ?? "Event not found"}</p>
        <Button variant="outline" size="sm" className="mt-4 rounded-full" onClick={fetchDetails}>
          Try again
        </Button>
      </div>
    );
  }

  // Statistics Computations
  const totalRegistered = registrations.length;
  const capVal = event.capacity ?? 0;
  const capacityPct = capVal > 0 ? Math.round((totalRegistered / capVal) * 100) : 0;

  // Attendance metrics
  const totalPresent = attendance.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
  const totalAbsent = attendance.filter((a) => a.status === "ABSENT").length;
  const totalLogged = attendance.length;
  const attendanceRate = totalLogged > 0 ? Math.round((totalPresent / totalLogged) * 100) : 0;

  // Filter list of members available to add (not yet registered)
  const availableMembers = allMembers.filter(
    (m) => !registrations.some((r) => r.memberId === m.id)
  );

  // Filter and search available members
  const filteredAvailableMembers = availableMembers.filter((m) => {
    const name = m.user.name ?? "";
    const email = m.user.email ?? "";
    return (
      name.toLowerCase().includes(addSearchQuery.toLowerCase()) ||
      email.toLowerCase().includes(addSearchQuery.toLowerCase())
    );
  });

  // Search registrations
  const filteredRegistrations = registrations.filter((reg) => {
    const name = reg.member.user.name ?? "";
    const email = reg.member.user.email ?? "";
    return (
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Event Header Card */}
      <div className="bg-card border border-border rounded-3xl p-6 shadow-[0_10px_30px_rgba(77,54,37,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{event.title}</h1>
            <p className="text-sm text-secondary-foreground mt-1 max-w-2xl">{event.description}</p>
            <div className="flex flex-wrap gap-4 mt-4 text-xs text-secondary-foreground font-medium">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {new Date(event.startDate).toLocaleDateString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              {event.venue && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {event.venue}
                </span>
              )}
            </div>
          </div>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary uppercase tracking-wider">
            {event.status}
          </span>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-border">
        {(["overview", "attendees", "attendance", "statistics"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-sm font-semibold capitalize transition-all border-b-2 -mb-[2px] ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-secondary-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === "overview" && (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 bg-card border border-border rounded-3xl p-6 space-y-6">
            <div>
              <h3 className="text-base font-semibold text-foreground">About this Event</h3>
              <p className="text-sm text-secondary-foreground mt-2 leading-relaxed">
                {event.description ?? "No description provided."}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t border-border">
              <div>
                <span className="text-xs font-semibold text-secondary-foreground uppercase tracking-wider">Venue Location</span>
                <p className="text-sm font-semibold mt-1">{event.venue ?? "No venue specified."}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-secondary-foreground uppercase tracking-wider">Start Time</span>
                <p className="text-sm font-semibold mt-1">
                  {new Date(event.startDate).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-3xl p-6 space-y-6">
            <h3 className="text-base font-semibold text-foreground">Registration Overview</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm font-semibold">
                  <span>Registered Capacity</span>
                  <span>
                    {totalRegistered}
                    {event.capacity ? ` / ${event.capacity}` : " (Unlimited)"}
                  </span>
                </div>
                {event.capacity && (
                  <div className="w-full bg-secondary h-2 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all"
                      style={{ width: `${Math.min(capacityPct, 100)}%` }}
                    />
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-border space-y-2.5 text-sm text-secondary-foreground">
                <div className="flex justify-between">
                  <span>Registration Status:</span>
                  <span className="font-semibold text-foreground">
                    {event.registrationRequired ? "Required" : "Open Access"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Draft State:</span>
                  <span className="font-semibold text-foreground uppercase">{event.status}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "attendees" && (
        <div className="space-y-6">
          {/* Toolbar & Register Member form */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-foreground" />
                <Input
                  placeholder="Search registered attendees…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {availableMembers.length > 0 && (
                <Button onClick={() => setIsAddDialogOpen(true)} className="rounded-full">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Attendees
                </Button>
              )}
            </div>

            {selectedRegIds.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                className="rounded-full shrink-0"
                disabled={deletingBulk}
                onClick={handleBulkDeleteRegistrations}
              >
                {deletingBulk && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete ({selectedRegIds.length})
              </Button>
            )}
          </div>

          {registerError && (
            <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive max-w-md">
              {registerError}
            </div>
          )}

          {/* Attendees Table */}
          {filteredRegistrations.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-border bg-card py-16 text-center">
              <Users className="h-8 w-8 text-secondary-foreground" />
              <p className="mt-4 text-sm font-semibold text-foreground">No attendees registered</p>
              <p className="mt-1 text-sm text-secondary-foreground">
                {searchQuery ? "Try refining your search keyword." : "Add members using the select menu above."}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[1.75rem] border border-border">
              <div className="hidden grid-cols-[40px_minmax(0,1fr)_200px_100px] items-center gap-4 border-b border-border bg-[#fcf8f1] px-5 py-3 text-xs font-medium uppercase tracking-[0.22em] text-secondary-foreground sm:grid">
                <input
                  type="checkbox"
                  onChange={handleSelectAllRegs}
                  checked={selectedRegIds.length === filteredRegistrations.length && filteredRegistrations.length > 0}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-ring cursor-pointer"
                  aria-label="Select all attendees"
                />
                <span>Member Info</span>
                <span>Registered At</span>
                <span className="text-right">Actions</span>
              </div>

              {filteredRegistrations.map((reg) => {
                const name = reg.member.user.name ?? reg.member.user.email ?? "Unknown Attendee";
                return (
                  <div
                    key={reg.id}
                    className="grid grid-cols-2 items-center gap-3 px-5 py-4 border-b border-border last:border-b-0 hover:bg-[#fcf8f1] transition-colors sm:grid-cols-[40px_minmax(0,1fr)_200px_100px]"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRegIds.includes(reg.id)}
                      onChange={() => handleSelectReg(reg.id)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-ring cursor-pointer"
                      aria-label={`Select ${name}`}
                    />
                    <div className="flex items-center gap-3 min-w-0">
                      {reg.member.user.image ? (
                        <img src={reg.member.user.image} alt={name} className="h-9 w-9 rounded-full object-cover shrink-0" />
                      ) : (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                          {name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                        <p className="truncate text-xs text-secondary-foreground">{reg.member.user.email}</p>
                      </div>
                    </div>

                    <div className="text-sm text-secondary-foreground">
                      {new Date(reg.registeredAt).toLocaleDateString()}
                    </div>

                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCancelRegistration(reg.memberId)}
                        className="text-destructive hover:bg-destructive/10 rounded-full"
                        aria-label={`Cancel registration for ${name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Attendees Dialog */}
          <Dialog open={isAddDialogOpen} onOpenChange={(v) => !registering && setIsAddDialogOpen(v)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Attendees</DialogTitle>
                <DialogDescription>
                  Select members to register for this event.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-foreground" />
                  <Input
                    placeholder="Search members..."
                    value={addSearchQuery}
                    onChange={(e) => setAddSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="max-h-[300px] overflow-y-auto border border-border rounded-2xl p-2 space-y-1 bg-card">
                  {filteredAvailableMembers.length === 0 ? (
                    <p className="text-sm text-secondary-foreground text-center py-4">No members available to add.</p>
                  ) : (
                    <>
                      <label className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#fcf8f1] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={
                            selectedAddMemberIds.length === filteredAvailableMembers.length &&
                            filteredAvailableMembers.length > 0
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAddMemberIds(filteredAvailableMembers.map((m) => m.id));
                            } else {
                              setSelectedAddMemberIds([]);
                            }
                          }}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-ring cursor-pointer"
                        />
                        <span className="text-sm font-semibold text-foreground">Select All</span>
                      </label>
                      <div className="border-t border-border my-1" />
                      {filteredAvailableMembers.map((m) => {
                        const name = m.user.name ?? m.user.email ?? "Unknown Member";
                        return (
                          <label
                            key={m.id}
                            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#fcf8f1] cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedAddMemberIds.includes(m.id)}
                              onChange={() => {
                                setSelectedAddMemberIds((prev) =>
                                  prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                                );
                              }}
                              className="h-4 w-4 rounded border-border text-primary focus:ring-ring cursor-pointer"
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-semibold text-foreground truncate">{name}</span>
                              {m.user.name && (
                                <span className="text-xs text-secondary-foreground truncate">{m.user.email}</span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>

              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setSelectedAddMemberIds([]);
                    setAddSearchQuery("");
                  }}
                  disabled={registering}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="rounded-full"
                  onClick={handleBulkRegisterMembers}
                  disabled={registering || selectedAddMemberIds.length === 0}
                >
                  {registering && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Add Selected ({selectedAddMemberIds.length})
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {activeTab === "attendance" && (
        <AttendanceList eventId={eventId} eventName={event.title} />
      )}

      {activeTab === "statistics" && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="bg-card border border-border rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <p className="text-xs font-bold text-secondary-foreground uppercase tracking-wider">Attendance Rate</p>
                <h4 className="text-3xl font-extrabold text-foreground mt-2">
                  {attendanceRate}%
                </h4>
              </div>
              <div className="pt-4 border-t border-border mt-6">
                <span className="text-xs text-secondary-foreground">Ratio of marked present/late to total logged check-ins.</span>
              </div>
            </div>

            <div className="bg-card border border-border rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <p className="text-xs font-bold text-secondary-foreground uppercase tracking-wider">Registrations vs Capacity</p>
                <h4 className="text-3xl font-extrabold text-foreground mt-2">
                  {capacityPct}%
                </h4>
              </div>
              <div className="pt-4 border-t border-border mt-6">
                <span className="text-xs text-secondary-foreground">Limit status: {event.capacity ? `${event.capacity} total slots` : "No limit"}</span>
              </div>
            </div>

            <div className="bg-card border border-border rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <p className="text-xs font-bold text-secondary-foreground uppercase tracking-wider">Attendee Breakdown</p>
                <h4 className="text-3xl font-extrabold text-foreground mt-2">
                  {totalPresent} <span className="text-sm font-semibold text-secondary-foreground">Present</span>
                </h4>
              </div>
              <div className="pt-4 border-t border-border mt-6">
                <span className="text-xs text-secondary-foreground">{totalAbsent} absent · {totalRegistered} registered total</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-secondary-foreground mb-4">Detailed Metrics</h3>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div className="p-4 rounded-2xl bg-secondary/30">
                <p className="text-xs font-semibold text-secondary-foreground">Total Registrations</p>
                <p className="text-2xl font-bold text-foreground mt-1">{totalRegistered}</p>
              </div>
              <div className="p-4 rounded-2xl bg-secondary/30">
                <p className="text-xs font-semibold text-secondary-foreground">Marked Present/Late</p>
                <p className="text-2xl font-bold text-foreground mt-1">{totalPresent}</p>
              </div>
              <div className="p-4 rounded-2xl bg-secondary/30">
                <p className="text-xs font-semibold text-secondary-foreground">Marked Absent</p>
                <p className="text-2xl font-bold text-foreground mt-1">{totalAbsent}</p>
              </div>
              <div className="p-4 rounded-2xl bg-secondary/30">
                <p className="text-xs font-semibold text-secondary-foreground">Presence/Absence Ratio</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {totalAbsent > 0 ? (totalPresent / totalAbsent).toFixed(1) : totalPresent}x
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
