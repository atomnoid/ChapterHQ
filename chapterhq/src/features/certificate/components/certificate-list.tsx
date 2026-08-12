"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft, ChevronRight, Award, Plus, RefreshCw, Search, Trash2, Download, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type Certificate, GenerateCertificateDialog, DeleteCertificateDialog } from "./certificate-dialogs";

interface PaginatedCertificates {
  items: Certificate[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type DialogState =
  | { type: "none" }
  | { type: "generate" }
  | { type: "delete"; certificate: Certificate };

export function CertificateList() {
  const [data, setData] = useState<PaginatedCertificates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<DialogState>({ type: "none" });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const LIMIT = 10;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/certificates?${params}`);
      if (!res.ok) throw new Error((await res.json()).message ?? "Failed to load certificates.");
      const json = await res.json();
      // Handle both direct response and data-wrapped response
      setData(json?.items !== undefined ? json : (json?.data ?? null));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally { setLoading(false); }
  }, [page, debouncedSearch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const closeDialog = () => setDialog({ type: "none" });

  const handleSuccess = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-sm min-w-[200px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-foreground" />
            <Input placeholder="Search certificatesâ€¦" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Button variant="outline" size="icon" className="rounded-full shrink-0" onClick={fetchData} disabled={loading} aria-label="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <Button className="rounded-full shrink-0" onClick={() => setDialog({ type: "generate" })}>
          <Award className="h-4 w-4 mr-2" /> Generate Certificate
        </Button>
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
              <div className="h-9 w-9 bg-secondary rounded-full animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-40 bg-secondary rounded animate-pulse" />
                <div className="h-3 w-28 bg-secondary/60 rounded animate-pulse" />
              </div>
              <div className="h-4 w-24 bg-secondary/60 rounded animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {!loading && !error && data?.items.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-border bg-card py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
            <Award className="h-6 w-6 text-secondary-foreground" />
          </span>
          <p className="mt-4 text-sm font-semibold text-foreground">No certificates issued</p>
          <p className="mt-1 text-sm text-secondary-foreground">
            {debouncedSearch ? "No results for your search term." : "No certificates have been generated yet."}
          </p>
          <Button className="mt-5 rounded-full" onClick={() => setDialog({ type: "generate" })}>
            <Award className="h-4 w-4 mr-2" /> Issue First Certificate
          </Button>
        </div>
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <>
          <div className="overflow-hidden rounded-[1.75rem] border border-border">
            <div className="hidden grid-cols-[minmax(0,1fr)_180px_120px_120px_120px] items-center gap-4 border-b border-border bg-[#fcf8f1] px-5 py-3 text-xs font-medium uppercase tracking-[0.22em] text-secondary-foreground lg:grid">
              <span>Title</span>
              <span>Recipient</span>
              <span>Issued</span>
              <span>Expires</span>
              <span className="text-right">Actions</span>
            </div>

            {data.items.map((cert) => (
              <div key={cert.id} className="grid grid-cols-[minmax(0,1fr)_100px] items-center gap-3 px-5 py-4 border-b border-border last:border-b-0 hover:bg-[#fcf8f1] transition-colors lg:grid-cols-[minmax(0,1fr)_180px_120px_120px_120px]">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary shrink-0" />
                    <p className="text-sm font-semibold text-foreground truncate">{cert.title}</p>
                  </div>
                  {cert.credentialId && (
                    <p className="text-xs text-secondary-foreground mt-0.5">ID: {cert.credentialId}</p>
                  )}
                </div>

                <div className="hidden lg:block min-w-0">
                  <p className="text-sm text-foreground truncate">
                    {cert.member.user.name ?? cert.member.user.email ?? "â€”"}
                  </p>
                </div>

                <p className="hidden text-sm text-secondary-foreground lg:block">
                  {new Date(cert.issueDate).toLocaleDateString()}
                </p>

                <p className="hidden text-sm text-secondary-foreground lg:block">
                  {cert.expiryDate ? new Date(cert.expiryDate).toLocaleDateString() : "No expiry"}
                </p>

                <div className="flex justify-end items-center gap-1">
                  {cert.certificateUrl ? (
                    <a
                      href={cert.certificateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open Certificate Link"
                      aria-label="Open Certificate Link"
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full h-8 w-8 text-primary hover:bg-primary/10"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full h-8 w-8 text-secondary-foreground hover:text-foreground"
                      title="Download (not yet available)"
                      aria-label="Download certificate"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => setDialog({ type: "delete", certificate: cert })}
                    aria-label="Delete certificate"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {data.totalPages > 1 && (
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-secondary-foreground">
                Showing {(page - 1) * LIMIT + 1}â€“{Math.min(page * LIMIT, data.total)} of {data.total}
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

      <GenerateCertificateDialog
        open={dialog.type === "generate"}
        onOpenChange={(o) => !o && closeDialog()}
        onSuccess={handleSuccess}
      />
      {dialog.type === "delete" && (
        <DeleteCertificateDialog
          certificate={dialog.certificate}
          open
          onOpenChange={(o) => !o && closeDialog()}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
