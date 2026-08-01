"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  MoreHorizontal,
  Edit2,
  Trash2,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type FinanceRecord,
  type TransactionType,
  CreateFinanceRecordDialog,
  EditFinanceRecordDialog,
  DeleteFinanceRecordDialog,
} from "./finance-dialogs";

interface PaginatedFinance {
  items: FinanceRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface SummaryData {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  transactionCount: number;
}

type DialogState =
  | { type: "none" }
  | { type: "create" }
  | { type: "edit"; record: FinanceRecord }
  | { type: "delete"; record: FinanceRecord };

export function FinanceList() {
  const [data, setData] = useState<PaginatedFinance | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<DialogState>({ type: "none" });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const LIMIT = 10;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const fetchFinanceData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (typeFilter !== "ALL") params.set("type", typeFilter);

      const [recordsRes, summaryRes] = await Promise.all([
        fetch(`/api/finance?${params}`),
        fetch("/api/finance/summary"),
      ]);

      if (!recordsRes.ok || !summaryRes.ok) {
        throw new Error("Failed to load financial records.");
      }

      const recordsJson = await recordsRes.json();
      const summaryJson = await summaryRes.json();

      setData(recordsJson?.data ?? recordsJson);
      setSummary(summaryJson?.data ?? summaryJson);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, typeFilter]);

  useEffect(() => {
    fetchFinanceData();
  }, [fetchFinanceData]);

  const closeDialog = () => setDialog({ type: "none" });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs text-secondary-foreground uppercase tracking-wider font-semibold">Total Income</p>
              <p className="text-2xl font-bold text-foreground">${summary.totalIncome.toFixed(2)}</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <TrendingDown className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs text-secondary-foreground uppercase tracking-wider font-semibold">Total Expenses</p>
              <p className="text-2xl font-bold text-foreground">${summary.totalExpense.toFixed(2)}</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <DollarSign className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs text-secondary-foreground uppercase tracking-wider font-semibold">Net Balance</p>
              <p className={`text-2xl font-bold ${summary.netBalance >= 0 ? "text-foreground" : "text-destructive"}`}>
                ${summary.netBalance.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-sm min-w-[200px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-foreground" />
            <Input
              placeholder="Search category or description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              aria-label="Search transactions"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-secondary-foreground shrink-0" />
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-2xl border border-border bg-background px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Filter transaction type"
            >
              <option value="ALL">All Types</option>
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="rounded-full border-border shrink-0"
            aria-label="Refresh"
            onClick={fetchFinanceData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <Button className="rounded-full shrink-0" onClick={() => setDialog({ type: "create" })}>
          <Plus className="h-4 w-4 mr-2" /> Add Transaction
        </Button>
      </div>

      {/* Error state */}
      {!loading && error && (
        <div className="rounded-2xl bg-destructive/5 border border-border px-5 py-4">
          <p className="text-sm font-medium text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-3 rounded-full" onClick={fetchFinanceData}>
            Try again
          </Button>
        </div>
      )}

      {/* Skeletons */}
      {loading && (
        <div className="overflow-hidden rounded-[1.75rem] border border-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-0">
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-32 bg-secondary rounded animate-pulse" />
                <div className="h-3 w-48 bg-secondary/60 rounded animate-pulse" />
              </div>
              <div className="h-6 w-16 bg-secondary rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && data?.items.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-border bg-card py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
            <DollarSign className="h-6 w-6 text-secondary-foreground" />
          </span>
          <p className="mt-4 text-sm font-semibold text-foreground">No transactions logged</p>
          <p className="mt-1 text-sm text-secondary-foreground">
            {debouncedSearch || typeFilter !== "ALL"
              ? "Try adjusting your search query or filters."
              : "No income or expense records found for this workspace."}
          </p>
          <Button className="mt-5 rounded-full" onClick={() => setDialog({ type: "create" })}>
            <Plus className="h-4 w-4 mr-2" /> Log Transaction
          </Button>
        </div>
      )}

      {/* Table */}
      {!loading && !error && data && data.items.length > 0 && (
        <>
          <div className="overflow-hidden rounded-[1.75rem] border border-border">
            <div className="hidden grid-cols-[120px_minmax(0,1fr)_120px_140px_52px] items-center gap-4 border-b border-border bg-[#fcf8f1] px-5 py-3 text-xs font-medium uppercase tracking-[0.22em] text-secondary-foreground md:grid">
              <span>Date</span>
              <span>Category / Description</span>
              <span>Type</span>
              <span>Amount</span>
              <span />
            </div>

            {data.items.map((record) => (
              <div
                key={record.id}
                className="grid grid-cols-[minmax(0,1fr)_80px_52px] items-center gap-3 px-5 py-4 border-b border-border last:border-b-0 hover:bg-[#fcf8f1] transition-colors md:grid-cols-[120px_minmax(0,1fr)_120px_140px_52px]"
              >
                <div className="text-sm text-secondary-foreground">
                  {new Date(record.date).toLocaleDateString()}
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{record.category}</p>
                  <p className="text-xs text-secondary-foreground truncate mt-0.5">{record.description ?? "—"}</p>
                </div>

                <div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      record.type === "INCOME" ? "bg-emerald-100 text-emerald-700" : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {record.type.charAt(0) + record.type.slice(1).toLowerCase()}
                  </span>
                </div>

                <div className={`text-sm font-semibold ${record.type === "INCOME" ? "text-emerald-700" : "text-destructive"}`}>
                  {record.type === "INCOME" ? "+" : "-"}${record.amount.toFixed(2)}
                </div>

                <div className="flex justify-end">
                  <div className="relative group">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full h-8 w-8"
                      onClick={() => setDialog({ type: "edit", record })}
                      aria-label="Edit transaction"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => setDialog({ type: "delete", record })}
                      aria-label="Delete transaction"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
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
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-foreground">
                  {page} / {data.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page === data.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <CreateFinanceRecordDialog
        open={dialog.type === "create"}
        onOpenChange={(open) => !open && closeDialog()}
        onSuccess={fetchFinanceData}
      />
      {dialog.type === "edit" && (
        <EditFinanceRecordDialog
          record={dialog.record}
          open={dialog.type === "edit"}
          onOpenChange={(open) => !open && closeDialog()}
          onSuccess={fetchFinanceData}
        />
      )}
      {dialog.type === "delete" && (
        <DeleteFinanceRecordDialog
          record={dialog.record}
          open={dialog.type === "delete"}
          onOpenChange={(open) => !open && closeDialog()}
          onSuccess={fetchFinanceData}
        />
      )}
    </div>
  );
}
