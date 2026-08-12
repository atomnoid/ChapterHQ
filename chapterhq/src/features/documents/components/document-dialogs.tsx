"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { FilePlus2, Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface DocumentItem {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string;
  category: string | null;
  createdAt: string;
}

interface CreateDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
}

export function CreateDocumentDialog({ open, onOpenChange, onSuccess }: CreateDocumentDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setFileUrl("");
      setCategory("");
      setError(null);
    }
  }, [open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          fileUrl,
          category: category || undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.message ?? "Unable to add the document.");
        return;
      }

      onOpenChange(false);
      onSuccess(payload.message ?? "Document added successfully.");
    } catch {
      setError("Unable to add the document. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !submitting && onOpenChange(value)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <FilePlus2 className="h-5 w-5 text-primary" />
            </span>
            <DialogTitle>Add document</DialogTitle>
          </div>
          <DialogDescription>Add a document link to this organization&apos;s library.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="document-title">Title</Label>
            <Input id="document-title" value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={200} placeholder="e.g. Annual report" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="document-url">File URL</Label>
            <Input id="document-url" type="url" value={fileUrl} onChange={(event) => setFileUrl(event.target.value)} required placeholder="https://example.com/report.pdf" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="document-category">Category</Label>
            <Input id="document-category" value={category} onChange={(event) => setCategory(event.target.value)} maxLength={100} placeholder="e.g. Reports" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="document-description">Description</Label>
            <textarea id="document-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} rows={3} placeholder="Optional details about this document"
              className="flex w-full rounded-2xl border border-border bg-background px-4 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" />
          </div>
          {error && <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-full" disabled={submitting} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="rounded-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add document
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteDocumentDialogProps {
  document: DocumentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
}

export function DeleteDocumentDialog({ document, open, onOpenChange, onSuccess }: DeleteDocumentDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => setError(null), [document, open]);

  async function handleDelete() {
    if (!document) return;
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/documents/${document.id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.message ?? "Unable to delete the document.");
        return;
      }
      onOpenChange(false);
      onSuccess(payload.message ?? "Document deleted successfully.");
    } catch {
      setError("Unable to delete the document. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(value) => !deleting && onOpenChange(value)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mb-1 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 className="h-5 w-5 text-destructive" />
            </span>
            <AlertDialogTitle>Delete document</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{document?.title}</strong>? It will no longer appear in the library.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleting} onClick={(event) => { event.preventDefault(); void handleDelete(); }}>
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
