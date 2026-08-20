"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Users, Building2 } from "lucide-react";

interface Committee {
  id: string;
  name: string;
}

interface CreateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFormCreated: (form: any) => void;
}

export function CreateFormDialog({ open, onOpenChange, onFormCreated }: CreateFormDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [required, setRequired] = useState(false);
  const [committeeId, setCommitteeId] = useState<string>("");
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [loadingCommittees, setLoadingCommittees] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch committees when dialog opens
  useEffect(() => {
    if (!open) return;
    setLoadingCommittees(true);
    fetch("/api/committees?limit=100")
      .then((r) => r.json())
      .then((data) => {
        // committees API returns { data: { items: [...] } } or { items: [...] }
        const items = data?.data?.items ?? data?.items ?? [];
        setCommittees(items);
      })
      .catch(() => setCommittees([]))
      .finally(() => setLoadingCommittees(false));
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Form name is required");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description || null,
          required,
          committeeId: committeeId || null,
          fields: [
            {
              label: "Sample Field",
              key: "sample_field",
              type: "SHORT_TEXT",
              required: true,
              placeholder: "Enter text",
            },
          ],
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to create form");
      }

      const form = await response.json();
      onFormCreated(form);
      setName("");
      setDescription("");
      setRequired(false);
      setCommitteeId("");
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-xl border border-border">
        <h2 className="text-xl font-semibold mb-1">Create New Form</h2>
        <p className="text-sm text-secondary-foreground mb-5">
          Create a form to collect information from new members on onboarding.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Form Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Member Information"
              className="w-full px-3 py-2 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              className="w-full px-3 py-2 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3}
              disabled={isLoading}
            />
          </div>

          {/* Committee Assignment */}
          <div>
            <label className="block text-sm font-medium mb-1">Assign to</label>
            <p className="text-xs text-secondary-foreground mb-2">
              Choose which members see this form during onboarding.
            </p>
            {loadingCommittees ? (
              <div className="flex items-center gap-2 text-sm text-secondary-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading committees…
              </div>
            ) : (
              <div className="space-y-2">
                {/* Global option */}
                <label
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl border cursor-pointer transition-colors ${
                    committeeId === ""
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-secondary/20"
                  }`}
                >
                  <input
                    type="radio"
                    name="committeeScope"
                    value=""
                    checked={committeeId === ""}
                    onChange={() => setCommitteeId("")}
                    className="accent-primary"
                    disabled={isLoading}
                  />
                  <Users className="h-4 w-4 text-secondary-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium">All Members</p>
                    <p className="text-xs text-secondary-foreground">
                      Shown to every new member regardless of committee
                    </p>
                  </div>
                </label>

                {/* Per-committee options */}
                {committees.map((c) => (
                  <label
                    key={c.id}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl border cursor-pointer transition-colors ${
                      committeeId === c.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-secondary/20"
                    }`}
                  >
                    <input
                      type="radio"
                      name="committeeScope"
                      value={c.id}
                      checked={committeeId === c.id}
                      onChange={() => setCommitteeId(c.id)}
                      className="accent-primary"
                      disabled={isLoading}
                    />
                    <Building2 className="h-4 w-4 text-secondary-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-secondary-foreground">
                        Shown only to members invited to this committee
                      </p>
                    </div>
                  </label>
                ))}

                {committees.length === 0 && (
                  <p className="text-xs text-secondary-foreground px-1">
                    No committees found — this form will be global.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="required"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              disabled={isLoading}
              className="h-4 w-4"
            />
            <label htmlFor="required" className="text-sm font-medium">
              This is a required form (must be completed before full access)
            </label>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-xl">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="rounded-full gap-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Form
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
