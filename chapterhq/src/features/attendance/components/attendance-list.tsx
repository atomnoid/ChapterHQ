"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2,
  Search,
  Filter,
  Check,
  X,
  Clock,
  RefreshCw,
  Users,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarkAttendanceDialog, BulkMarkAttendanceDialog, type AttendanceStatus } from "./attendance-dialogs";

interface OrgMember {
  id: string;
  joinedAt: string;
  status: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

interface AttendanceRecord {
  id: string;
  eventId: string;
  memberId: string;
  status: AttendanceStatus;
  notes: string | null;
  markedAt: string;
  member: {
    id: string;
    user: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
    };
  };
}

interface AttendanceListProps {
  eventId: string;
  eventName: string;
}

export function AttendanceList({ eventId, eventName }: AttendanceListProps) {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [dialogState, setDialogState] = useState<{
    type: "none" | "single" | "bulk";
    memberId?: string;
    memberName?: string;
    currentStatus?: AttendanceStatus;
    currentNotes?: string;
  }>({ type: "none" });

  const [isPending, setIsPending] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [membersRes, attendanceRes] = await Promise.all([
        fetch("/api/members?limit=200"),
        fetch(`/api/events/${eventId}/attendance`),
      ]);

      if (!membersRes.ok || !attendanceRes.ok) {
        throw new Error("Failed to load attendance list.");
      }

      const membersJson = await membersRes.json();
      const attendanceJson = await attendanceRes.json();

      setMembers(membersJson?.items ?? membersJson?.data?.items ?? []);
      setAttendance(attendanceJson?.data ?? attendanceJson ?? []);
      setSelectedMemberIds([]);
    } catch (e: any) {
      setError(e.message ?? "Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredMembers = members.filter((member) => {
    const name = member.user.name ?? "";
    const email = member.user.email ?? "";
    const matchesSearch =
      name.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase());

    const record = attendance.find((att) => att.memberId === member.id);
    const status = record?.status ?? "ABSENT"; // default to absent if unmarked

    if (statusFilter === "ALL") return matchesSearch;
    return matchesSearch && status === statusFilter;
  });

  const getStatusBadge = (status: AttendanceStatus | "UNMARKED") => {
    const styles = {
      PRESENT: "bg-emerald-100 text-emerald-700",
      ABSENT: "bg-destructive/10 text-destructive",
      LATE: "bg-amber-100 text-amber-700",
      UNMARKED: "bg-secondary text-secondary-foreground",
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </span>
    );
  };

  const getAttendanceRate = () => {
    if (members.length === 0) return 0;
    const presentCount = attendance.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
    return Math.round((presentCount / members.length) * 100);
  };

  const handleSelectMember = (memberId: string) => {
    if (isPending) return;
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isPending) return;
    if (e.target.checked) {
      setSelectedMemberIds(filteredMembers.map((m) => m.id));
    } else {
      setSelectedMemberIds([]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats summary section */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </span>
          <div>
            <p className="text-xs text-secondary-foreground uppercase tracking-wider font-semibold">Total Members</p>
            <p className="text-2xl font-bold text-foreground">{members.length}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle className="h-6 w-6 text-emerald-600" />
          </span>
          <div>
            <p className="text-xs text-secondary-foreground uppercase tracking-wider font-semibold">Marked Present/Late</p>
            <p className="text-2xl font-bold text-foreground">
              {attendance.filter((a) => a.status === "PRESENT" || a.status === "LATE").length}
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
            <Clock className="h-6 w-6 text-amber-600" />
          </span>
          <div>
            <p className="text-xs text-secondary-foreground uppercase tracking-wider font-semibold">Attendance Rate</p>
            <p className="text-2xl font-bold text-foreground">{getAttendanceRate()}%</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-sm min-w-[200px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-foreground" />
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              aria-label="Search attendees"
              disabled={isPending}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-secondary-foreground shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-2xl border border-border bg-background px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Filter attendance status"
              disabled={isPending}
            >
              <option value="ALL">All Statuses</option>
              <option value="PRESENT">Present</option>
              <option value="LATE">Late</option>
              <option value="ABSENT">Absent</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="rounded-full border-border shrink-0"
            aria-label="Refresh"
            onClick={fetchData}
            disabled={loading || isPending}
          >
            <RefreshCw className={`h-4 w-4 ${loading || isPending ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {selectedMemberIds.length > 0 && (
          <Button
            className="rounded-full shrink-0"
            disabled={isPending}
            onClick={() => setDialogState({ type: "bulk" })}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Mark Selected ({selectedMemberIds.length})
          </Button>
        )}
      </div>

      {/* Error state */}
      {!loading && error && (
        <div className="rounded-2xl bg-destructive/5 border border-border px-5 py-4">
          <p className="text-sm font-medium text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-3 rounded-full" onClick={fetchData} disabled={isPending}>
            Try again
          </Button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="overflow-hidden rounded-[1.75rem] border border-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-0">
              <div className="h-4 w-4 bg-secondary rounded animate-pulse" />
              <div className="h-9 w-9 bg-secondary rounded-full animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-32 bg-secondary rounded animate-pulse" />
                <div className="h-3 w-48 bg-secondary/60 rounded animate-pulse" />
              </div>
              <div className="h-6 w-20 bg-secondary rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {/* Empty states */}
      {!loading && !error && filteredMembers.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-border bg-card py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
            <AlertTriangle className="h-6 w-6 text-secondary-foreground" />
          </span>
          <p className="mt-4 text-sm font-semibold text-foreground">No members found</p>
          <p className="mt-1 text-sm text-secondary-foreground">Try adjusting your filters or search keywords.</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && filteredMembers.length > 0 && (
        <div className="overflow-hidden rounded-[1.75rem] border border-border">
          <div className="hidden grid-cols-[48px_minmax(0,1fr)_160px_160px_120px] items-center gap-4 border-b border-border bg-[#fcf8f1] px-5 py-3 text-xs font-medium uppercase tracking-[0.22em] text-secondary-foreground sm:grid">
            <input
              type="checkbox"
              onChange={handleSelectAll}
              disabled={isPending}
              checked={selectedMemberIds.length === filteredMembers.length}
              className="h-4.5 w-4.5 rounded border-border text-primary focus:ring-ring cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Select all members"
            />
            <span>Member</span>
            <span>Status</span>
            <span>Notes</span>
            <span className="text-right">Actions</span>
          </div>

          {filteredMembers.map((member) => {
            const name = member.user.name ?? member.user.email ?? "Unknown Member";
            const record = attendance.find((att) => att.memberId === member.id);
            const status = record?.status ?? "ABSENT";
            const notes = record?.notes ?? "—";

            return (
              <div
                key={member.id}
                className="grid grid-cols-[48px_minmax(0,1fr)_80px] items-center gap-3 px-5 py-4 border-b border-border last:border-b-0 hover:bg-[#fcf8f1] transition-colors sm:grid-cols-[48px_minmax(0,1fr)_160px_160px_120px]"
              >
                <input
                  type="checkbox"
                  checked={selectedMemberIds.includes(member.id)}
                  onChange={() => handleSelectMember(member.id)}
                  disabled={isPending}
                  className="h-4.5 w-4.5 rounded border-border text-primary focus:ring-ring cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={`Select ${name}`}
                />
                <div className="flex items-center gap-3 min-w-0">
                  {member.user.image ? (
                    <img src={member.user.image} alt={name} className="h-9 w-9 rounded-full object-cover shrink-0" />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                    <p className="truncate text-xs text-secondary-foreground">{member.user.email}</p>
                  </div>
                </div>

                <div>{getStatusBadge(status)}</div>

                <div className="hidden text-sm text-secondary-foreground truncate sm:block">
                  {notes}
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full text-xs h-8"
                    disabled={isPending}
                    onClick={() =>
                      setDialogState({
                        type: "single",
                        memberId: member.id,
                        memberName: name,
                        currentStatus: status,
                        currentNotes: record?.notes ?? "",
                      })
                    }
                  >
                    Mark
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {dialogState.type === "single" && (
        <MarkAttendanceDialog
          open={dialogState.type === "single"}
          onOpenChange={(open) => !open && setDialogState({ type: "none" })}
          onSuccess={async () => {
            setIsPending(true);
            await fetchData();
            setIsPending(false);
          }}
          eventId={eventId}
          memberId={dialogState.memberId!}
          memberName={dialogState.memberName!}
          initialStatus={dialogState.currentStatus}
          initialNotes={dialogState.currentNotes}
        />
      )}

      {dialogState.type === "bulk" && (
        <BulkMarkAttendanceDialog
          open={dialogState.type === "bulk"}
          onOpenChange={(open) => !open && setDialogState({ type: "none" })}
          onSuccess={async () => {
            setIsPending(true);
            await fetchData();
            setIsPending(false);
          }}
          eventId={eventId}
          memberIds={selectedMemberIds}
          memberNames={`${selectedMemberIds.length} selected members`}
        />
      )}
    </div>
  );
}
