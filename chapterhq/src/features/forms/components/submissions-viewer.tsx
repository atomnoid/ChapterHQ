"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Submission = {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  createdAt: string;
  answers?: Record<string, any>;
};

interface SubmissionsViewerProps {
  formId: string;
}

export function SubmissionsViewer({ formId }: SubmissionsViewerProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch submissions on mount and on page/search change
  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          ...(searchTerm && { search: searchTerm }),
        });

        const response = await fetch(`/api/forms/${formId}/submissions?${params}`);
        if (!response.ok) {
          throw new Error("Failed to fetch submissions");
        }

        const data = await response.json();
        setSubmissions(data.items || []);
        setTotal(data.total || 0);
        setError(null);
        setSelectedIds(new Set()); // Clear selections on new page
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load submissions");
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [formId, page, limit, searchTerm]);

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(submissions.map((s) => s.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelect = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleExport = async (selectedOnly: boolean = false) => {
    try {
      setExporting(true);
      const body = selectedOnly && selectedIds.size > 0 
        ? { submissionIds: Array.from(selectedIds) } 
        : {};

      const response = await fetch(`/api/forms/${formId}/submissions/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Failed to export submissions");
      }

      // Get filename from header
      const contentDisposition = response.headers.get("content-disposition");
      const filename = contentDisposition
        ? contentDisposition.split("filename=")[1].replace(/"/g, "")
        : "submissions.csv";

      // Download CSV
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export submissions");
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 pb-8">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(77,54,37,0.08)] sm:p-8">
        <div className="mb-6">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-secondary-foreground">
            Responses
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
            Form Submissions
          </h2>
          <p className="mt-2 text-sm text-secondary-foreground">
            {total} submission{total !== 1 ? "s" : ""} total
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(77,54,37,0.08)] sm:p-8">
        <Input
          type="search"
          placeholder="Search by member name or email..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {/* Export Actions */}
      {submissions.length > 0 && (
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => handleExport(false)}
            disabled={exporting}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export All
          </Button>
          {selectedIds.size > 0 && (
            <Button
              onClick={() => handleExport(true)}
              disabled={exporting}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export Selected ({selectedIds.size})
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-[0_20px_60px_rgba(77,54,37,0.08)]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-secondary-foreground">Loading submissions...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-secondary-foreground mb-4">No submissions yet</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          submissions.length > 0 &&
                          selectedIds.size === submissions.length
                        }
                        onCheckedChange={(checked) =>
                          toggleSelectAll(checked as boolean)
                        }
                      />
                    </TableHead>
                    <TableHead>Member Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(submission.id)}
                          onCheckedChange={(checked) =>
                            toggleSelect(submission.id, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {submission.memberName || "Unknown"}
                      </TableCell>
                      <TableCell className="text-secondary-foreground">
                        {submission.memberEmail}
                      </TableCell>
                      <TableCell className="text-sm text-secondary-foreground">
                        {new Date(submission.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // Could navigate to submission detail view
                            alert(`View submission ${submission.id}`);
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-border px-6 py-4">
              <div className="flex gap-2">
                <span className="text-sm text-secondary-foreground">
                  Rows per page:
                </span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="border border-border rounded px-2 py-1 text-sm bg-background"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <span className="text-sm text-secondary-foreground">
                Page {page} of {totalPages}
              </span>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
