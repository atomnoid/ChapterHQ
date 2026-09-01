"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Search,
  Filter,
  Clock,
  RefreshCw,
  Users,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarkAttendanceDialog, BulkMarkAttendanceDialog, BulkDeleteAttendanceDialog, type AttendanceStatus } from "./attendance-dialogs";
import { ScanQrDialog } from "./scan-qr-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

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
  customAnswers?: any;
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

interface ExternalRegistration {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  usn: string | null;
  status: string;
  registeredAt: string;
  attendance: {
    id: string;
    status: string;
    markedAt: string;
    notes?: string;
  } | null;
  customAnswers?: any;
}

interface ParticipantRow {
  id: string; // unique row id: e.g. member-id or external-id
  type: "MEMBER" | "EXTERNAL";
  name: string;
  email: string;
  image: string | null;
  status: AttendanceStatus | "UNMARKED";
  notes: string;
  originalId: string; // raw DB ID
  customAnswers?: any;
  phone?: string | null;
  usn?: string | null;
  committees?: { id: string; name: string }[];
}

interface AttendanceListProps {
  eventId: string;
  eventName: string;
}

export function AttendanceList({ eventId, eventName }: AttendanceListProps) {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [externalRegs, setExternalRegs] = useState<ExternalRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "MEMBER" | "EXTERNAL">("ALL");
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [isScanOpen, setIsScanOpen] = useState(false);

  const [dialogState, setDialogState] = useState<{
    type: "none" | "single" | "bulk" | "delete";
    memberId?: string;
    externalId?: string;
    memberName?: string;
    currentStatus?: AttendanceStatus;
    currentNotes?: string;
  }>({ type: "none" });

  const [infoDialogState, setInfoDialogState] = useState<{
    open: boolean;
    name?: string;
    email?: string;
    type?: string;
    customAnswers?: any;
    phone?: string | null;
    usn?: string | null;
    committees?: { id: string; name: string }[];
  }>({ open: false });

  const [customForm, setCustomForm] = useState<any | null>(null);

  const [isPending, setIsPending] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [regsRes, attendanceRes, formRes] = await Promise.all([
        fetch(`/api/events/${eventId}/registrations?limit=100`),
        fetch(`/api/events/${eventId}/attendance?combined=true`),
        fetch(`/api/events/${eventId}/form`),
      ]);

      if (!regsRes.ok || !attendanceRes.ok) {
        throw new Error("Failed to load attendance list.");
      }

      if (formRes.ok) {
        const formJson = await formRes.json();
        setCustomForm(formJson);
      } else {
        setCustomForm(null);
      }

      const regsJson = await regsRes.json();
      const attendanceJson = await attendanceRes.json();

      const registrations = regsJson?.items ?? regsJson?.data?.items ?? [];
      const registeredMembers = registrations
        .filter((r: any) => !r.isExternal)
        .map((r: any) => ({
          id: r.memberId,
          joinedAt: r.registeredAt,
          status: r.status,
          user: {
            id: r.member?.user?.id ?? r.memberId,
            name: r.member?.user?.name ?? null,
            email: r.member?.user?.email ?? null,
            image: r.member?.user?.image ?? null,
          },
          customAnswers: r.customAnswers,
          committees: r.committees || [],
        }));

      setMembers(registeredMembers);
      const attData = attendanceJson?.data ?? attendanceJson;
      if (attData && typeof attData === "object" && "memberAttendance" in attData) {
        setAttendance(attData.memberAttendance || []);
        setExternalRegs(attData.externalRegs || []);
      } else {
        setAttendance(Array.isArray(attData) ? attData : []);
        setExternalRegs([]);
      }
      setSelectedRowIds([]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Construct unified rows
  const participantRows: ParticipantRow[] = [
    ...members.map((m: any) => {
      const att = attendance.find((a) => a.memberId === m.id);
      return {
        id: `member-${m.id}`,
        type: "MEMBER" as const,
        name: m.user.name ?? m.user.email ?? "Unknown Member",
        email: m.user.email ?? "",
        image: m.user.image,
        status: (att ? att.status : "UNMARKED") as AttendanceStatus | "UNMARKED",
        notes: att?.notes ?? "",
        originalId: m.id,
        customAnswers: m.customAnswers,
        committees: m.committees || [],
      };
    }),
    ...externalRegs.map((e) => {
      return {
        id: `external-${e.id}`,
        type: "EXTERNAL" as const,
        name: e.name,
        email: e.email,
        image: null,
        status: (e.attendance ? e.attendance.status : "UNMARKED") as AttendanceStatus | "UNMARKED",
        notes: e.attendance?.notes ?? "",
        originalId: e.id,
        customAnswers: e.customAnswers,
        phone: e.phone,
        usn: e.usn,
        committees: [],
      };
    }),
  ];

  const filteredRows = participantRows.filter((row) => {
    const matchesSearch =
      row.name.toLowerCase().includes(search.toLowerCase()) ||
      row.email.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ABSENT" ? (row.status === "ABSENT" || row.status === "UNMARKED") : row.status === statusFilter) ||
      (statusFilter === "UNMARKED" && row.status === "UNMARKED");

    const matchesType = typeFilter === "ALL" || row.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: AttendanceStatus | "UNMARKED") => {
    const styles: Record<string, string> = {
      PRESENT: "bg-emerald-100 text-emerald-700",
      ABSENT: "bg-destructive/10 text-destructive",
      EXCUSED: "bg-amber-100 text-amber-700",
      UNMARKED: "bg-secondary text-secondary-foreground",
    };
    const label: Record<string, string> = {
      PRESENT: "Present",
      ABSENT: "Absent",
      EXCUSED: "Excused",
      UNMARKED: "Unmarked",
    };
    const cls = styles[status] ?? "bg-secondary text-secondary-foreground";
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
        {label[status] ?? status}
      </span>
    );
  };

  const getAttendanceRate = () => {
    const markedCount = participantRows.filter((r) => r.status !== "UNMARKED").length;
    if (markedCount === 0) return 0;
    const presentCount = participantRows.filter((r) => r.status === "PRESENT").length;
    return Math.round((presentCount / markedCount) * 100);
  };

  const handleSelectRow = (id: string) => {
    if (isPending) return;
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isPending) return;
    if (e.target.checked) {
      setSelectedRowIds(filteredRows.map((r) => r.id));
    } else {
      setSelectedRowIds([]);
    }
  };

  function handleExportCsv() {
    try {
      const selectedMembers = selectedRowIds.filter(id => id.startsWith("member-")).map(id => id.replace("member-", ""));
      const selectedExternals = selectedRowIds.filter(id => id.startsWith("external-")).map(id => id.replace("external-", ""));

      let query = "";
      if (selectedMembers.length > 0) query += `memberIds=${selectedMembers.join(",")}&`;
      if (selectedExternals.length > 0) query += `externalIds=${selectedExternals.join(",")}&`;

      window.open(`/api/events/${eventId}/attendance/export?${query}`, "_blank");
    } catch {
      alert("Failed to export attendance CSV.");
    }
  }

  // Get raw selected IDs for members and external attendees
  const selectedMemberDbIds = selectedRowIds
    .filter(id => id.startsWith("member-"))
    .map(id => id.replace("member-", ""));

  const selectedExternalDbIds = selectedRowIds
    .filter(id => id.startsWith("external-"))
    .map(id => id.replace("external-", ""));

  return (
    <div className="space-y-6">
      {/* Stats summary section */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </span>
          <div>
            <p className="text-xs text-secondary-foreground uppercase tracking-wider font-semibold">Total Registered</p>
            <p className="text-2xl font-bold text-foreground">{participantRows.length}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle className="h-6 w-6 text-emerald-600" />
          </span>
          <div>
            <p className="text-xs text-secondary-foreground uppercase tracking-wider font-semibold">Present</p>
            <p className="text-2xl font-bold text-foreground">
              {participantRows.filter((r) => r.status === "PRESENT").length}
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </span>
          <div>
            <p className="text-xs text-secondary-foreground uppercase tracking-wider font-semibold">Absent / Excused</p>
            <p className="text-2xl font-bold text-foreground">
              {participantRows.filter((r) => r.status === "ABSENT" || r.status === "EXCUSED" || r.status === "UNMARKED").length}
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
            <Clock className="h-6 w-6 text-amber-600" />
          </span>
          <div>
            <p className="text-xs text-secondary-foreground uppercase tracking-wider font-semibold">Attendance Rate</p>
            <p className="text-2xl font-bold text-foreground">
              {participantRows.length > 0
                ? Math.round((participantRows.filter((r) => r.status === "PRESENT").length / participantRows.length) * 100)
                : 0}%
            </p>
            <p className="text-[10px] text-secondary-foreground mt-0.5">of total registered</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-sm min-w-[200px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-foreground" />
            <Input
              placeholder="Search by name or email..."
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
              <option value="ABSENT">Absent</option>
              <option value="EXCUSED">Excused</option>
              <option value="UNMARKED">Unmarked</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-secondary-foreground shrink-0" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as "ALL" | "MEMBER" | "EXTERNAL")}
              className="h-10 rounded-2xl border border-border bg-background px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Filter participant type"
              disabled={isPending}
            >
              <option value="ALL">All Types</option>
              <option value="MEMBER">Members</option>
              <option value="EXTERNAL">Non-Members (External)</option>
            </select>
          </div>

          <Button
            variant="outline"
            className="rounded-full border-border font-semibold flex items-center gap-2"
            onClick={() => setIsScanOpen(true)}
            disabled={isPending}
          >
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="5" height="5" x="3" y="3" rx="1" />
              <rect width="5" height="5" x="16" y="3" rx="1" />
              <rect width="5" height="5" x="3" y="16" rx="1" />
              <path d="M21 16V21H16" />
              <path d="M21 12H16V16" />
              <path d="M12 21V16H16" />
              <path d="M12 12H16" />
              <path d="M12 3V12" />
              <path d="M3 12H12" />
            </svg>
            Scan QR
          </Button>

          <Button
            variant="outline"
            className="rounded-full border-border font-semibold flex items-center gap-2"
            onClick={handleExportCsv}
            disabled={isPending}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>

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

        {selectedRowIds.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            {selectedMemberDbIds.length > 0 && (
              <Button
                className="rounded-full"
                disabled={isPending}
                onClick={() => setDialogState({ type: "bulk" })}
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Mark ({selectedMemberDbIds.length})
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              className="rounded-full"
              disabled={isPending}
              onClick={() => setDialogState({ type: "delete" })}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete ({selectedRowIds.length})
            </Button>
          </div>
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
      {!loading && !error && filteredRows.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-border bg-card py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
            <AlertTriangle className="h-6 w-6 text-secondary-foreground" />
          </span>
          <p className="mt-4 text-sm font-semibold text-foreground">No participants found</p>
          <p className="mt-1 text-sm text-secondary-foreground">Try adjusting your filters or search keywords.</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && filteredRows.length > 0 && (
        <div className="overflow-hidden rounded-[1.75rem] border border-border">
          <div className="hidden grid-cols-[48px_minmax(0,1fr)_130px_120px_100px_160px_130px] items-center gap-4 border-b border-border bg-[#fcf8f1] px-5 py-3 text-xs font-medium uppercase tracking-[0.22em] text-secondary-foreground sm:grid">
            <input
              type="checkbox"
              onChange={handleSelectAll}
              disabled={isPending}
              checked={selectedRowIds.length === filteredRows.length && filteredRows.length > 0}
              className="h-4.5 w-4.5 rounded border-border text-primary focus:ring-ring cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Select all rows"
            />
            <span>Participant</span>
            <span>Committee</span>
            <span>Type</span>
            <span>Status</span>
            <span>Notes</span>
            <span className="text-right">Actions</span>
          </div>

          {filteredRows.map((row) => {
            const record = attendance.find((att) => att.memberId === row.originalId);
            const status = row.status;
            const notes = row.notes;

            return (
              <div
                key={row.id}
                className="grid grid-cols-[48px_minmax(0,1fr)_80px] items-center gap-3 px-5 py-4 border-b border-border last:border-b-0 hover:bg-[#fcf8f1] transition-colors sm:grid-cols-[48px_minmax(0,1fr)_130px_120px_100px_160px_130px]"
              >
                <input
                  type="checkbox"
                  checked={selectedRowIds.includes(row.id)}
                  onChange={() => handleSelectRow(row.id)}
                  disabled={isPending}
                  className="h-4.5 w-4.5 rounded border-border text-primary focus:ring-ring cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={`Select ${row.name}`}
                />
                <div className="flex items-center gap-3 min-w-0">
                  {row.image ? (
                    <img src={row.image} alt={row.name} className="h-9 w-9 rounded-full object-cover shrink-0" />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {row.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{row.name}</p>
                    <p className="truncate text-xs text-secondary-foreground">{row.email}</p>
                  </div>
                </div>

                <div className="hidden sm:block text-xs text-secondary-foreground truncate">
                  {row.committees && row.committees.length > 0 ? (
                    row.committees.map(c => c.name).join(", ")
                  ) : (
                    row.type === "EXTERNAL" ? "No Committee" : "None"
                  )}
                </div>

                <div className="hidden sm:block text-xs font-semibold uppercase tracking-wider text-secondary-foreground">
                  {row.type}
                </div>

                <div>{getStatusBadge(status)}</div>

                <div className="hidden text-sm text-secondary-foreground truncate sm:block">
                  {notes}
                </div>

                 <div className="flex justify-end gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full text-xs h-8 border-border"
                    onClick={() =>
                      setInfoDialogState({
                        open: true,
                        name: row.name,
                        email: row.email,
                        type: row.type,
                        customAnswers: row.customAnswers,
                        phone: row.phone,
                        usn: row.usn,
                        committees: row.committees,
                      })
                    }
                  >
                    Info
                  </Button>
                  {row.type === "MEMBER" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full text-xs h-8 text-primary hover:text-primary hover:bg-primary/10"
                      disabled={isPending}
                      onClick={() =>
                        setDialogState({
                          type: "single",
                          memberId: row.originalId,
                          memberName: row.name,
                          currentStatus: status === "UNMARKED" ? "ABSENT" : status,
                          currentNotes: record?.notes ?? "",
                        })
                      }
                    >
                      Mark
                    </Button>
                  ) : (
                    <span className="text-xs text-secondary-foreground italic px-2 py-1 flex items-center">QR Scan</span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full text-xs h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    disabled={isPending}
                    title={`Delete attendance record for ${row.name}`}
                    onClick={() =>
                      setDialogState({
                        type: "delete",
                        memberId: row.type === "MEMBER" ? row.originalId : undefined,
                        externalId: row.type === "EXTERNAL" ? row.originalId : undefined,
                        memberName: row.name,
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
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
          memberIds={selectedMemberDbIds}
          memberNames={`${selectedMemberDbIds.length} selected members`}
        />
      )}

      {dialogState.type === "delete" && (
        <BulkDeleteAttendanceDialog
          open={dialogState.type === "delete"}
          onOpenChange={(open) => !open && setDialogState({ type: "none" })}
          onSuccess={async () => {
            setIsPending(true);
            await fetchData();
            setIsPending(false);
          }}
          eventId={eventId}
          memberIds={
            dialogState.memberId
              ? [dialogState.memberId]
              : selectedMemberDbIds
          }
          externalIds={
            dialogState.externalId
              ? [dialogState.externalId]
              : selectedExternalDbIds
          }
          memberCount={
            dialogState.memberId || dialogState.externalId
              ? 1
              : selectedRowIds.length
          }
        />
      )}

      <ScanQrDialog
        open={isScanOpen}
        onOpenChange={setIsScanOpen}
        eventId={eventId}
        onSuccess={fetchData}
      />

      <Dialog open={infoDialogState.open} onOpenChange={(v) => setInfoDialogState(prev => ({ ...prev, open: v }))}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Attendee Registration Info</DialogTitle>
            <DialogDescription className="text-xs">
              Registration data submitted for this event.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm border-t border-border mt-3 pt-3">
            <div className="grid grid-cols-3 gap-2">
              <span className="font-semibold text-secondary-foreground">Name:</span>
              <span className="col-span-2 text-foreground font-medium">{infoDialogState.name}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="font-semibold text-secondary-foreground">Email:</span>
              <span className="col-span-2 text-foreground font-medium break-all">{infoDialogState.email}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="font-semibold text-secondary-foreground">Type:</span>
              <span className="col-span-2 text-foreground uppercase text-xs tracking-wider font-semibold">{infoDialogState.type}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="font-semibold text-secondary-foreground">Committee:</span>
              <span className="col-span-2 text-foreground font-medium">
                {infoDialogState.committees && infoDialogState.committees.length > 0 ? (
                  infoDialogState.committees.map((c: any) => c.name).join(", ")
                ) : (
                  infoDialogState.type === "EXTERNAL" ? "No Committee" : "None"
                )}
              </span>
            </div>

            {customForm && customForm.fields && infoDialogState.customAnswers ? (
              <div className="bg-secondary/10 border border-border/50 rounded-2xl p-4 mt-4 space-y-2.5">
                <p className="font-bold border-b border-border pb-1.5 mb-1.5 opacity-90 uppercase tracking-wider text-[10px] text-secondary-foreground">Custom Form Responses</p>
                {customForm.fields.map((field: any) => {
                  const answer = infoDialogState.customAnswers?.[field.key];
                  let displayVal = "-";
                  if (answer !== undefined && answer !== null && answer !== "") {
                    if (Array.isArray(answer)) displayVal = answer.join(", ");
                    else if (typeof answer === "boolean") displayVal = answer ? "Yes" : "No";
                    else displayVal = String(answer);
                  }
                  return (
                    <div key={field.id} className="grid grid-cols-3 gap-2 text-xs">
                      <span className="font-semibold text-secondary-foreground truncate">{field.label}:</span>
                      <span className="col-span-2 text-foreground break-words font-medium">{displayVal}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              (infoDialogState.phone || infoDialogState.usn) && (
                <div className="bg-secondary/10 border border-border/50 rounded-2xl p-4 mt-4 space-y-2.5">
                  <p className="font-bold border-b border-border pb-1.5 mb-1.5 opacity-90 uppercase tracking-wider text-[10px] text-secondary-foreground">Registration Info</p>
                  {infoDialogState.phone && (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <span className="font-semibold text-secondary-foreground">Phone:</span>
                      <span className="col-span-2 text-foreground font-medium">{infoDialogState.phone}</span>
                    </div>
                  )}
                  {infoDialogState.usn && (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <span className="font-semibold text-secondary-foreground">USN/ID:</span>
                      <span className="col-span-2 text-foreground font-medium">{infoDialogState.usn}</span>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setInfoDialogState(prev => ({ ...prev, open: false }))} className="rounded-full w-full">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
