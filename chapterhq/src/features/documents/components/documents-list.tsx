"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, FileText, Filter, Loader2, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreateDocumentDialog, DeleteDocumentDialog, type DocumentItem } from "./document-dialogs";

interface DocumentsResponse {
  items: DocumentItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface MePermissionsResponse {
  permissions: string[];
}

const LIMIT = 10;

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function DocumentsList() {
  const [data, setData] = useState<DocumentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteDocument, setDeleteDocument] = useState<DocumentItem | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (category) params.set("category", category);
      const response = await fetch(`/api/documents?${params}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Unable to load documents.");
      setData(payload.data ?? payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load documents.");
    } finally {
      setLoading(false);
    }
  }, [category, debouncedSearch, page]);

  useEffect(() => {
    void fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/permissions")
      .then((response) => response.ok ? response.json() : null)
      .then((payload: MePermissionsResponse | null) => { if (!cancelled) setPermissions(payload?.permissions ?? []); })
      .catch(() => { if (!cancelled) setPermissions([]); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const canCreate = permissions.includes("documents:create");
  const canDelete = permissions.includes("documents:delete");
  async function handleMutationSuccess(message: string) {
    setNotice(message);
    if (data?.items.length === 1 && page > 1) setPage((current) => current - 1);
    else await fetchDocuments();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-[260px] flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-10" placeholder="Search documents…" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-secondary-foreground" />
            <Input value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }} className="w-40" placeholder="Category" aria-label="Filter by category" />
          </div>
          <Button variant="outline" size="icon" className="shrink-0 rounded-full" onClick={() => void fetchDocuments()} disabled={loading} aria-label="Refresh documents">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        {canCreate && <Button className="shrink-0 rounded-full" onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Add document</Button>}
      </div>

      {notice && <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><span>{notice}</span><button onClick={() => setNotice(null)} className="font-medium" aria-label="Dismiss message">Dismiss</button></div>}
      {!loading && error && <div className="rounded-2xl border border-border bg-destructive/5 px-5 py-4"><p className="text-sm font-medium text-destructive">{error}</p><Button variant="outline" size="sm" className="mt-3 rounded-full" onClick={() => void fetchDocuments()}>Try again</Button></div>}

      {loading && <div className="space-y-3 rounded-[1.75rem] border border-border p-5">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="flex gap-4"><div className="h-10 w-10 animate-pulse rounded-full bg-secondary" /><div className="flex-1 space-y-2"><div className="h-4 w-1/3 animate-pulse rounded bg-secondary" /><div className="h-3 w-1/2 animate-pulse rounded bg-secondary/60" /></div></div>)}</div>}

      {!loading && !error && data?.items.length === 0 && <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-border bg-card py-16 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary"><FileText className="h-6 w-6 text-secondary-foreground" /></span><p className="mt-4 text-sm font-semibold text-foreground">No documents found</p><p className="mt-1 text-sm text-secondary-foreground">{search || category ? "Try adjusting your search or category." : "Add a link to your first organization document."}</p>{canCreate && <Button className="mt-5 rounded-full" onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Add document</Button>}</div>}

      {!loading && !error && data && data.items.length > 0 && <><div className="overflow-hidden rounded-[1.75rem] border border-border">{data.items.map((document) => <div key={document.id} className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-b-0 hover:bg-secondary/40"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10"><FileText className="h-5 w-5 text-primary" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-foreground">{document.title}</p>{document.description && <p className="mt-0.5 truncate text-xs text-secondary-foreground">{document.description}</p>}<p className="mt-1 text-xs text-secondary-foreground">{document.category ?? "Uncategorized"} · Added {formatDate(document.createdAt)}</p></div><div className="flex shrink-0 items-center gap-1"><Button asChild variant="ghost" size="icon" className="rounded-full" aria-label={`Open ${document.title}`}><a href={document.fileUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a></Button>{canDelete && <Button variant="ghost" size="icon" className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteDocument(document)} aria-label={`Delete ${document.title}`}><Trash2 className="h-4 w-4" /></Button>}</div></div>)}</div>{data.totalPages > 1 && <div className="flex items-center justify-between gap-4"><p className="text-sm text-secondary-foreground">Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, data.total)} of {data.total}</p><div className="flex items-center gap-2"><Button variant="outline" size="icon" className="h-8 w-8 rounded-full" disabled={page === 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft className="h-4 w-4" /></Button><span className="text-sm font-medium">{page} / {data.totalPages}</span><Button variant="outline" size="icon" className="h-8 w-8 rounded-full" disabled={page === data.totalPages} onClick={() => setPage((current) => current + 1)}><ChevronRight className="h-4 w-4" /></Button></div></div>}</>}

      <CreateDocumentDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={(message) => { void handleMutationSuccess(message); }} />
      <DeleteDocumentDialog document={deleteDocument} open={Boolean(deleteDocument)} onOpenChange={(open) => { if (!open) setDeleteDocument(null); }} onSuccess={(message) => { void handleMutationSuccess(message); }} />
    </div>
  );
}
