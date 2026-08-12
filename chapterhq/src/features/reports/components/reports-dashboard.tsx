"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { BarChart3, CalendarDays, ChevronRight, CircleDollarSign, Loader2, RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

type ReportKey = "members" | "events" | "finance" | "attendance";

interface MembersReport {
  summary: { totalMembers: number; activeMembers: number; pendingMembers: number; leftMembers: number; blockedMembers: number; newMembersThisMonth: number };
  monthlyTrends: { month: string; joined: number }[];
}

interface EventsReport {
  summary: { totalEvents: number; draftEvents: number; publishedEvents: number; cancelledEvents: number; completedEvents: number; totalRegistrations: number; attendanceRecords: number };
  monthlyTrends: { month: string; created: number; registrations: number }[];
}

interface FinanceReport {
  summary: { totalIncome: number; totalExpense: number; netBalance: number; transactionCount: number };
  monthlyTrends: { month: string; income: number; expense: number; net: number; transactions: number }[];
}

interface AttendanceReport {
  summary: { totalRecords: number; presentCount: number; absentCount: number; excusedCount: number; attendanceRate: number };
  monthlyTrends: { month: string; present: number; absent: number; excused: number; total: number; attendanceRate: number }[];
}

type ReportData = MembersReport | EventsReport | FinanceReport | AttendanceReport;

const REPORTS: { key: ReportKey; label: string; description: string; icon: typeof Users }[] = [
  { key: "members", label: "Members", description: "Membership growth and status", icon: Users },
  { key: "events", label: "Events", description: "Event activity and registrations", icon: CalendarDays },
  { key: "finance", label: "Finance", description: "Income, expenses, and balance", icon: CircleDollarSign },
  { key: "attendance", label: "Attendance", description: "Attendance records and rates", icon: BarChart3 },
];

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const number = new Intl.NumberFormat("en-IN");

function formatMonth(month: string) {
  const [year, value] = month.split("-").map(Number);
  return Number.isFinite(year) && Number.isFinite(value)
    ? new Date(year, value - 1, 1).toLocaleDateString(undefined, { month: "short", year: "2-digit" })
    : month;
}

function isReportData(value: unknown): value is ReportData {
  return Boolean(value && typeof value === "object" && "summary" in value && "monthlyTrends" in value && Array.isArray((value as { monthlyTrends?: unknown }).monthlyTrends));
}

function SummaryCard({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "positive" | "negative" }) {
  const color = tone === "positive" ? "text-emerald-700" : tone === "negative" ? "text-destructive" : "text-foreground";
  return <div className="rounded-2xl border border-border bg-background p-4"><p className="text-xs font-medium uppercase tracking-[0.18em] text-secondary-foreground">{label}</p><p className={`mt-2 text-2xl font-semibold tracking-[-0.04em] ${color}`}>{value}</p></div>;
}

function EmptyReport({ label }: { label: string }) {
  return <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-border bg-background px-6 py-14 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary"><BarChart3 className="h-5 w-5 text-secondary-foreground" /></span><p className="mt-4 text-sm font-semibold text-foreground">No {label.toLowerCase()} data yet</p><p className="mt-1 text-sm text-secondary-foreground">This report will populate as your organization records activity.</p></div>;
}

function TrendRows({ rows, series, currency = false }: { rows: { month: string; [key: string]: number | string }[]; series: { key: string; label: string; color: string }[]; currency?: boolean }) {
  const maximum = Math.max(1, ...rows.flatMap((row) => series.map(({ key }) => Number(row[key]) || 0)));
  return <div className="overflow-hidden rounded-[1.75rem] border border-border"><div className="border-b border-border bg-secondary/40 px-5 py-3"><p className="text-sm font-semibold text-foreground">Monthly trends</p><div className="mt-2 flex flex-wrap gap-3">{series.map((item) => <span key={item.key} className="flex items-center gap-1.5 text-xs text-secondary-foreground"><span className={`h-2 w-2 rounded-full ${item.color}`} />{item.label}</span>)}</div></div><div className="divide-y divide-border">{rows.map((row) => <div key={row.month} className="grid gap-3 px-5 py-3 sm:grid-cols-[80px_1fr]"><p className="text-xs font-medium text-secondary-foreground sm:pt-1">{formatMonth(row.month)}</p><div className="space-y-2">{series.map((item) => { const value = Number(row[item.key]) || 0; return <div key={item.key} className="flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary"><div className={`h-full rounded-full ${item.color}`} style={{ width: `${(value / maximum) * 100}%` }} /></div><span className="w-20 text-right text-xs tabular-nums text-secondary-foreground">{currency ? inr.format(value) : number.format(value)}</span></div>; })}</div></div>)}</div></div>;
}

function MembersView({ report }: { report: MembersReport }) {
  if (report.summary.totalMembers === 0) return <EmptyReport label="Members" />;
  return <div className="space-y-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><SummaryCard label="Total members" value={number.format(report.summary.totalMembers)} /><SummaryCard label="Active" value={number.format(report.summary.activeMembers)} tone="positive" /><SummaryCard label="New this month" value={number.format(report.summary.newMembersThisMonth)} /><SummaryCard label="Pending" value={number.format(report.summary.pendingMembers)} /><SummaryCard label="Left" value={number.format(report.summary.leftMembers)} /><SummaryCard label="Blocked" value={number.format(report.summary.blockedMembers)} tone="negative" /></div><TrendRows rows={report.monthlyTrends} series={[{ key: "joined", label: "Joined", color: "bg-primary" }]} /></div>;
}

function EventsView({ report }: { report: EventsReport }) {
  if (report.summary.totalEvents === 0) return <EmptyReport label="Events" />;
  return <div className="space-y-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><SummaryCard label="Total events" value={number.format(report.summary.totalEvents)} /><SummaryCard label="Published" value={number.format(report.summary.publishedEvents)} tone="positive" /><SummaryCard label="Registrations" value={number.format(report.summary.totalRegistrations)} /><SummaryCard label="Attendance records" value={number.format(report.summary.attendanceRecords)} /><SummaryCard label="Draft" value={number.format(report.summary.draftEvents)} /><SummaryCard label="Completed" value={number.format(report.summary.completedEvents)} /><SummaryCard label="Cancelled" value={number.format(report.summary.cancelledEvents)} tone="negative" /></div><TrendRows rows={report.monthlyTrends} series={[{ key: "created", label: "Created", color: "bg-primary" }, { key: "registrations", label: "Registrations", color: "bg-emerald-500" }]} /></div>;
}

function FinanceView({ report }: { report: FinanceReport }) {
  if (report.summary.transactionCount === 0) return <EmptyReport label="Finance" />;
  return <div className="space-y-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><SummaryCard label="Total income" value={inr.format(report.summary.totalIncome)} tone="positive" /><SummaryCard label="Total expense" value={inr.format(report.summary.totalExpense)} tone="negative" /><SummaryCard label="Net balance" value={inr.format(report.summary.netBalance)} tone={report.summary.netBalance >= 0 ? "positive" : "negative"} /><SummaryCard label="Transactions" value={number.format(report.summary.transactionCount)} /></div><TrendRows rows={report.monthlyTrends} series={[{ key: "income", label: "Income", color: "bg-emerald-500" }, { key: "expense", label: "Expenses", color: "bg-destructive" }]} currency /></div>;
}

function AttendanceView({ report }: { report: AttendanceReport }) {
  if (report.summary.totalRecords === 0) return <EmptyReport label="Attendance" />;
  return <div className="space-y-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><SummaryCard label="Attendance rate" value={`${report.summary.attendanceRate}%`} tone="positive" /><SummaryCard label="Total records" value={number.format(report.summary.totalRecords)} /><SummaryCard label="Present" value={number.format(report.summary.presentCount)} tone="positive" /><SummaryCard label="Absent" value={number.format(report.summary.absentCount)} tone="negative" /><SummaryCard label="Excused" value={number.format(report.summary.excusedCount)} /></div><TrendRows rows={report.monthlyTrends} series={[{ key: "present", label: "Present", color: "bg-emerald-500" }, { key: "absent", label: "Absent", color: "bg-destructive" }, { key: "excused", label: "Excused", color: "bg-amber-500" }]} /></div>;
}

function ReportContent({ reportKey, report }: { reportKey: ReportKey; report: ReportData }) {
  if (reportKey === "members") return <MembersView report={report as MembersReport} />;
  if (reportKey === "events") return <EventsView report={report as EventsReport} />;
  if (reportKey === "finance") return <FinanceView report={report as FinanceReport} />;
  return <AttendanceView report={report as AttendanceReport} />;
}

export function ReportsDashboard() {
  const [selected, setSelected] = useState<ReportKey>("members");
  const [reports, setReports] = useState<Partial<Record<ReportKey, ReportData>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async (key: ReportKey, force = false) => {
    if (!force && reports[key]) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/reports/${key}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Unable to load this report.");
      const report = payload.data ?? payload;
      if (!isReportData(report)) throw new Error("The report returned an unexpected response.");
      setReports((current) => ({ ...current, [key]: report }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load this report.");
    } finally {
      setLoading(false);
    }
  }, [reports]);

  useEffect(() => { void loadReport(selected); }, [loadReport, selected]);

  const selectedDefinition = REPORTS.find((report) => report.key === selected)!;
  const report = reports[selected];

  return <div className="space-y-6"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{REPORTS.map((item) => { const Icon = item.icon; const active = item.key === selected; return <button key={item.key} onClick={() => setSelected(item.key)} className={`rounded-2xl border p-4 text-left transition-colors ${active ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-secondary/50"}`}><div className="flex items-center justify-between gap-3"><span className={`flex h-9 w-9 items-center justify-center rounded-full ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}><Icon className="h-4 w-4" /></span><ChevronRight className={`h-4 w-4 ${active ? "text-primary" : "text-secondary-foreground"}`} /></div><p className="mt-4 text-sm font-semibold text-foreground">{item.label}</p><p className="mt-1 text-xs text-secondary-foreground">{item.description}</p></button>; })}</div><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-lg font-semibold text-foreground">{selectedDefinition.label} report</p><p className="text-sm text-secondary-foreground">Organization data from the last 12 months.</p></div><Button variant="outline" size="sm" className="rounded-full" onClick={() => void loadReport(selected, true)} disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Refresh</Button></div>{loading && !report && <div className="grid gap-3 sm:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-2xl bg-secondary" />)}</div>}{!loading && error && <div className="rounded-2xl border border-border bg-destructive/5 px-5 py-4"><p className="text-sm font-medium text-destructive">{error}</p><Button variant="outline" size="sm" className="mt-3 rounded-full" onClick={() => void loadReport(selected, true)}>Try again</Button></div>}{report && <ReportContent reportKey={selected} report={report} />}</div>;
}
