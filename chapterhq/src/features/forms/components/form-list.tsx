"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CreateFormDialog } from "./create-form-dialog";
import { FormActionsMenu } from "./form-actions-menu";

interface CustomForm {
  id: string;
  name: string;
  description: string | null;
  status: string;
  required: boolean;
  committeeId: string | null;
  committee: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  fields: Array<{ id: string }>;
  _count?: { submissions: number };
}

export function FormList() {
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const fetchForms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/forms");
      if (!response.ok) throw new Error("Failed to fetch forms");
      const data = await response.json();
      setForms(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch forms");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  const handleFormCreated = (newForm: CustomForm) => {
    setForms((prev) => [newForm, ...prev]);
    setShowCreateDialog(false);
  };

  const handleFormDeleted = (formId: string) => {
    setForms((prev) => prev.filter((f) => f.id !== formId));
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-destructive mb-3" />
        <p className="text-sm text-destructive mb-4">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchForms}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-secondary-foreground">
          {forms.length} form{forms.length !== 1 ? "s" : ""} created
        </p>
        <Button
          className="rounded-full gap-2"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="h-4 w-4" />
          Create Form
        </Button>
      </div>

      {forms.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center max-w-lg mx-auto my-8 space-y-4">
          <p className="text-sm text-secondary-foreground">
            No custom forms created yet. Create one to get started with member onboarding.
          </p>
          <Button
            className="rounded-full"
            onClick={() => setShowCreateDialog(true)}
          >
            Create Your First Form
          </Button>
        </div>
      ) : (
        <div className="w-full">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Scope</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Type</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">Fields</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">Submissions</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Created</th>
                <th className="px-4 py-3 text-right font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {forms.map((form) => (
                <tr key={form.id} className="border-b border-border hover:bg-secondary/20">
                  <td className="px-4 py-3">
                    <Link href={`/forms/${form.id}/edit`} className="hover:underline font-medium text-foreground">
                      {form.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                        form.status === "ACTIVE"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {form.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {form.committee ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-800">
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        {form.committee.name}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        All Members
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2.5 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                      {form.required ? "Required" : "Optional"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-secondary-foreground">
                    {form.fields.length}
                  </td>
                  <td className="px-4 py-3 text-center text-secondary-foreground">
                    {form._count?.submissions || 0}
                  </td>
                  <td className="px-4 py-3 text-secondary-foreground text-xs">
                    {new Date(form.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <FormActionsMenu form={form} onDeleted={handleFormDeleted} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onFormCreated={handleFormCreated}
      />
    </div>
  );
}
