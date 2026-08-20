"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import {
  ChevronLeft, ChevronRight, Filter, Edit2, Trash2,
  Plus, RefreshCw, Search, Package, MoreHorizontal,
  Download, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type InventoryItem, type InventoryStatus,
  CreateInventoryDialog, EditInventoryDialog, DeleteInventoryDialog,
} from "./inventory-dialogs";

interface PaginatedInventory {
  items: InventoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type DialogState =
  | { type: "none" }
  | { type: "create" }
  | { type: "edit"; item: InventoryItem }
  | { type: "delete"; item: InventoryItem };

const STATUS_STYLES: Record<InventoryStatus, string> = {
  IN_STOCK: "bg-emerald-100 text-emerald-700",
  LOW_STOCK: "bg-amber-100 text-amber-700",
  OUT_OF_STOCK: "bg-destructive/10 text-destructive",
};

const STATUS_LABELS: Record<InventoryStatus, string> = {
  IN_STOCK: "In Stock",
  LOW_STOCK: "Low Stock",
  OUT_OF_STOCK: "Out of Stock",
};

function InventoryRowMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const btnRef = useRef<HTMLButtonElement>(null);

  function handleOpen() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuStyle({
        position: "fixed",
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
        zIndex: 9999,
      });
    }
    setOpen((v) => !v);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div>
      <Button
        ref={btnRef}
        variant="ghost"
        size="icon"
        className="rounded-full h-8 w-8"
        onClick={handleOpen}
        aria-label="Actions"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {open &&
        typeof window !== "undefined" &&
        createPortal(
          <>
            <div className="fixed inset-0" style={{ zIndex: 9998 }} onClick={() => setOpen(false)} />
            <div
              style={menuStyle}
              className="w-40 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_12px_30px_rgba(77,54,37,0.1)]"
            >
              <button
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-secondary-foreground hover:bg-secondary"
                onClick={() => { setOpen(false); onEdit(); }}
              >
                <Edit2 className="h-3.5 w-3.5" /> Edit
              </button>
              <button
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10"
                onClick={() => { setOpen(false); onDelete(); }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}

export function InventoryList() {
  const [data, setData] = useState<PaginatedInventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dateRange, setDateRange] = useState<string>("ALL");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [downloading, setDownloading] = useState(false);
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<DialogState>({ type: "none" });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data: session } = useSession();
  const activeCommitteeId = session?.activeCommitteeId ?? null;
  const LIMIT = 10;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [dateRange, customStartDate, customEndDate]);

  const getDateRangeParams = useCallback(() => {
    if (dateRange === "ALL") return { startDate: "", endDate: "" };

    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;

    if (dateRange === "LAST_7_DAYS") {
      start = new Date(); start.setDate(now.getDate() - 7); end = now;
    } else if (dateRange === "LAST_30_DAYS") {
      start = new Date(); start.setDate(now.getDate() - 30); end = now;
    } else if (dateRange === "THIS_MONTH") {
      start = new Date(now.getFullYear(), now.getMonth(), 1); end = now;
    } else if (dateRange === "LAST_MONTH") {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (dateRange === "CUSTOM") {
      if (customStartDate) start = new Date(customStartDate);
      if (customEndDate) { end = new Date(customEndDate); end.setHours(23, 59, 59, 999); }
    }

    return {
      startDate: start ? start.toISOString() : "",
      endDate: end ? end.toISOString() : "",
    };
  }, [dateRange, customStartDate, customEndDate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const { startDate, endDate } = getDateRangeParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const res = await fetch(`/api/inventory?${params}`);
      if (!res.ok) throw new Error((await res.json()).message ?? "Failed to load inventory.");
      const json = await res.json();
      setData(json?.data ?? json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally { setLoading(false); }
  }, [page, debouncedSearch, statusFilter, activeCommitteeId, getDateRangeParams]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDownloadCSV = async () => {
    setDownloading(true);
    try {
      const params = new URLSearchParams({ page: "1", limit: "10000" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const { startDate, endDate } = getDateRangeParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/inventory?${params}`);
      if (!res.ok) throw new Error("Failed to load records for download.");

      const json = await res.json();
      const rawItems = json?.data?.items ?? json?.items;
      const records: InventoryItem[] = rawItems || [];

      if (records.length === 0) { alert("No records found to download."); return; }

      const csvHeaders = ["Name", "Category", "Quantity", "Unit", "Location", "Status"];
      const csvRows = records.map((item) => [
        `"${(item.name || "").replace(/"/g, '""')}"`,
        `"${(item.category || "").replace(/"/g, '""')}"`,
        item.quantity,
        `"${(item.unit || "").replace(/"/g, '""')}"`,
        `"${(item.location || "").replace(/"/g, '""')}"`,
        STATUS_LABELS[item.status],
      ].join(","));

      const csvContent = [csvHeaders.join(","), ...csvRows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `inventory_report_${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to download CSV.");
    } finally {
      setDownloading(false);
    }
  };

  const closeDialog = () => setDialog({ type: "none" });

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-sm min-w-[200px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-foreground" />
            <Input placeholder="Search items…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-secondary-foreground shrink-0" />
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="h-10 rounded-2xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="ALL">All Statuses</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-secondary-foreground shrink-0" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="h-10 rounded-2xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Filter date range"
            >
              <option value="ALL">All Time</option>
              <option value="LAST_7_DAYS">Last 7 Days</option>
              <option value="LAST_30_DAYS">Last 30 Days</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="LAST_MONTH">Last Month</option>
              <option value="CUSTOM">Custom Range</option>
            </select>
          </div>

          {dateRange === "CUSTOM" && (
            <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-10 rounded-2xl px-3 w-[130px] text-sm shrink-0"
                aria-label="Start date"
              />
              <span className="text-xs text-secondary-foreground">to</span>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-10 rounded-2xl px-3 w-[130px] text-sm shrink-0"
                aria-label="End date"
              />
            </div>
          )}

          <Button variant="outline" size="icon" className="rounded-full shrink-0" onClick={fetchData} disabled={loading} aria-label="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="rounded-full shrink-0 border-border"
            onClick={handleDownloadCSV}
            disabled={downloading || loading}
          >
            <Download className={`h-4 w-4 mr-2 ${downloading ? "animate-pulse" : ""}`} />
            {downloading ? "Downloading..." : "Download CSV"}
          </Button>
          <Button className="rounded-full shrink-0" onClick={() => setDialog({ type: "create" })}>
            <Plus className="h-4 w-4 mr-2" /> Add Item
          </Button>
        </div>
      </div>

      {!loading && error && (
        <div className="rounded-2xl bg-destructive/5 border border-border px-5 py-4">
          <p className="text-sm font-medium text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-3 rounded-full" onClick={fetchData}>Try again</Button>
        </div>
      )}

      {loading && (
        <div className="overflow-hidden rounded-[1.75rem] border border-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-0">
              <div className="h-9 w-9 bg-secondary rounded animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-36 bg-secondary rounded animate-pulse" />
                <div className="h-3 w-24 bg-secondary/60 rounded animate-pulse" />
              </div>
              <div className="h-6 w-20 bg-secondary rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {!loading && !error && data?.items.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-border bg-card py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
            <Package className="h-6 w-6 text-secondary-foreground" />
          </span>
          <p className="mt-4 text-sm font-semibold text-foreground">No inventory items found</p>
          <p className="mt-1 text-sm text-secondary-foreground">
            {debouncedSearch || statusFilter !== "ALL" ? "Try adjusting your search or filters." : "No items have been added yet."}
          </p>
          <Button className="mt-5 rounded-full" onClick={() => setDialog({ type: "create" })}>
            <Plus className="h-4 w-4 mr-2" /> Add First Item
          </Button>
        </div>
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <>
          <div className="overflow-hidden rounded-[1.75rem] border border-border">
            <div className="hidden grid-cols-[minmax(0,1fr)_120px_80px_100px_120px_52px] items-center gap-4 border-b border-border bg-[#fcf8f1] px-5 py-3 text-xs font-medium uppercase tracking-[0.22em] text-secondary-foreground sm:grid">
              <span>Item</span>
              <span>Category</span>
              <span>Qty</span>
              <span>Unit</span>
              <span>Status</span>
              <span />
            </div>

            {data.items.map((item) => (
              <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_80px_52px] items-center gap-3 px-5 py-4 border-b border-border last:border-b-0 hover:bg-[#fcf8f1] transition-colors sm:grid-cols-[minmax(0,1fr)_120px_80px_100px_120px_52px]">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                  {item.location && <p className="text-xs text-secondary-foreground truncate">{item.location}</p>}
                </div>
                <p className="hidden text-sm text-secondary-foreground sm:block">{item.category ?? "—"}</p>
                <p className="hidden text-sm font-semibold text-foreground sm:block">{item.quantity}</p>
                <p className="hidden text-sm text-secondary-foreground sm:block">{item.unit ?? "—"}</p>
                <div className="hidden sm:block">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[item.status]}`}>
                    {STATUS_LABELS[item.status]}
                  </span>
                </div>
                <div className="flex justify-end">
                  <InventoryRowMenu
                    onEdit={() => setDialog({ type: "edit", item })}
                    onDelete={() => setDialog({ type: "delete", item })}
                  />
                </div>
              </div>
            ))}
          </div>

          {data.totalPages > 1 && (
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-secondary-foreground">
                Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, data.total)} of {data.total}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">{page} / {data.totalPages}</span>
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <CreateInventoryDialog open={dialog.type === "create"} onOpenChange={(o) => !o && closeDialog()} onSuccess={fetchData} />
      {dialog.type === "edit" && (
        <EditInventoryDialog item={dialog.item} open onOpenChange={(o) => !o && closeDialog()} onSuccess={fetchData} />
      )}
      {dialog.type === "delete" && (
        <DeleteInventoryDialog item={dialog.item} open onOpenChange={(o) => !o && closeDialog()} onSuccess={fetchData} />
      )}
    </div>
  );
}
