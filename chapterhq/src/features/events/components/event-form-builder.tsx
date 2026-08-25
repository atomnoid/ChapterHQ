"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, CheckCircle2, AlertTriangle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FormField {
  id: string;
  label: string;
  key: string;
  type: string;
  required: boolean;
  placeholder?: string | null;
  helpText?: string | null;
  options?: Array<{ label: string; value: string }> | string[] | null;
}

interface CustomForm {
  id: string;
  name: string;
  description?: string | null;
  fields: FormField[];
}

interface EventFormBuilderProps {
  eventId: string;
}

const FIELD_TYPES = [
  { value: "SHORT_TEXT", label: "Short Text" },
  { value: "LONG_TEXT", label: "Long Text" },
  { value: "EMAIL", label: "Email Address" },
  { value: "PHONE", label: "Phone Number" },
  { value: "NUMBER", label: "Number" },
  { value: "DATE", label: "Date" },
  { value: "DROPDOWN", label: "Dropdown Select" },
  { value: "RADIO", label: "Radio Selection" },
  { value: "CHECKBOX", label: "Checkboxes" },
  { value: "YES_NO", label: "Yes / No Toggle" },
];

export function EventFormBuilder({ eventId }: EventFormBuilderProps) {
  const [form, setForm] = useState<CustomForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Field Form State
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState("SHORT_TEXT");
  const [newRequired, setNewRequired] = useState(false);
  const [newPlaceholder, setNewPlaceholder] = useState("");
  const [newOptionsText, setNewOptionsText] = useState("");

  useEffect(() => {
    fetchForm();
  }, [eventId]);

  async function fetchForm() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/form`);
      if (res.status === 404) {
        setForm(null);
        return;
      }
      if (!res.ok) throw new Error("Failed to load form.");
      const data = await res.json();
      setForm(data);
    } catch (err: any) {
      setError(err.message || "Failed to load form.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateForm() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/form`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Event Registration Form",
          description: "Custom registration form fields for this event.",
          required: false,
          fields: [],
        }),
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.message || "Failed to initialize form.");
      }
      const data = await res.json();
      setForm(data);
      showSuccess("Custom registration form enabled!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteForm() {
    if (!confirm("Are you sure you want to delete this custom form and revert to default fields?")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/form`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete form.");
      setForm(null);
      showSuccess("Custom form removed. Reverted to default form.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddField(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    setSaving(true);
    setError(null);

    // Convert options string comma separated into Array<{label, value}>
    let options: Array<{ label: string; value: string }> | null = null;
    if (["DROPDOWN", "RADIO", "CHECKBOX"].includes(newType) && newOptionsText.trim()) {
      options = newOptionsText
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean)
        .map((o) => ({ label: o, value: o.toLowerCase().replace(/\s+/g, "-") }));
    }

    const key = newLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");

    try {
      const res = await fetch(`/api/events/${eventId}/form`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newLabel.trim(),
          key,
          type: newType,
          required: newRequired,
          placeholder: newPlaceholder.trim() || null,
          options,
        }),
      });

      if (!res.ok) throw new Error("Failed to add field.");
      setNewLabel("");
      setNewPlaceholder("");
      setNewOptionsText("");
      setNewRequired(false);
      await fetchForm();
      showSuccess("Field added successfully!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteField(fieldId: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/form`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_field",
          fieldId,
        }),
      });
      if (!res.ok) throw new Error("Failed to delete field.");
      await fetchForm();
      showSuccess("Field deleted.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function showSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 bg-card border border-border rounded-3xl">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        <span className="text-sm text-secondary-foreground font-medium">Loading form details...</span>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-3xl p-6 shadow-[0_10px_30px_rgba(77,54,37,0.04)] space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Registration Form Builder
          </h3>
          <p className="text-xs text-secondary-foreground mt-0.5">
            Configure custom fields for your public registration page.
          </p>
        </div>
        {form && (
          <Button variant="destructive" size="sm" onClick={handleDeleteForm} disabled={saving} className="rounded-full">
            Delete Form
          </Button>
        )}
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">
          <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
          {success}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
          {error}
        </div>
      )}

      {!form ? (
        <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
          <p className="text-sm text-secondary-foreground max-w-sm">
            This event currently uses the default registration form (Name, Email, Phone, Student ID).
          </p>
          <Button onClick={handleCreateForm} disabled={saving} className="rounded-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-1.5" />}
            Build Custom Registration Form
          </Button>
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2">
          {/* Form Fields List */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground border-b border-border pb-2">Active Fields</h4>
            {form.fields.length === 0 ? (
              <p className="text-xs text-secondary-foreground py-6 text-center italic border border-dashed border-border rounded-2xl">
                No custom fields added yet. The form only has the default Name and Email identification fields.
              </p>
            ) : (
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {form.fields.map((f) => {
                  const typeLabel = FIELD_TYPES.find((t) => t.value === f.type)?.label || f.type;
                  return (
                    <div key={f.id} className="flex items-center justify-between gap-3 p-3 bg-muted/30 rounded-2xl border border-border/50 hover:bg-muted/50 transition-all">
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                          {f.label}
                          {f.required && <span className="text-red-500 font-bold">*</span>}
                        </p>
                        <p className="text-[10px] text-secondary-foreground">
                          {typeLabel} {f.placeholder ? `(Placeholder: ${f.placeholder})` : ""}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive text-secondary-foreground rounded-full" onClick={() => handleDeleteField(f.id)} disabled={saving}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add Field Form */}
          <div className="bg-muted/20 border border-border rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-foreground">Add Custom Field</h4>
            <form onSubmit={handleAddField} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="field-label" className="text-xs">Field Label *</Label>
                <Input
                  id="field-label"
                  placeholder="e.g. Dietary Requirements"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  required
                  disabled={saving}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="field-type" className="text-xs">Field Type</Label>
                <Select value={newType} onValueChange={setNewType} disabled={saving}>
                  <SelectTrigger id="field-type" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-xs">
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {["DROPDOWN", "RADIO", "CHECKBOX"].includes(newType) && (
                <div className="space-y-1">
                  <Label htmlFor="field-options" className="text-xs">Options (Comma separated) *</Label>
                  <Input
                    id="field-options"
                    placeholder="e.g. Vegetarian, Vegan, Halal, None"
                    value={newOptionsText}
                    onChange={(e) => setNewOptionsText(e.target.value)}
                    required
                    disabled={saving}
                    className="h-9 text-xs"
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="field-placeholder" className="text-xs">Placeholder (Optional)</Label>
                <Input
                  id="field-placeholder"
                  placeholder="e.g. Enter any allergies"
                  value={newPlaceholder}
                  onChange={(e) => setNewPlaceholder(e.target.value)}
                  disabled={saving}
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1.5">
                <Checkbox
                  id="field-required"
                  checked={newRequired}
                  onCheckedChange={(checked) => setNewRequired(!!checked)}
                  disabled={saving}
                />
                <Label htmlFor="field-required" className="text-xs font-semibold select-none cursor-pointer">
                  Required Field
                </Label>
              </div>

              <Button type="submit" size="sm" className="w-full rounded-full h-9 text-xs mt-3" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
                Add Field
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
