"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const FIELD_TYPES = [
  "SHORT_TEXT",
  "LONG_TEXT",
  "EMAIL",
  "PHONE",
  "NUMBER",
  "DATE",
  "DROPDOWN",
  "RADIO",
  "CHECKBOX",
  "YES_NO",
];

type CustomFormField = {
  id?: string;
  label: string;
  key: string;
  type: string;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[];
  order: number;
};

type CustomForm = {
  id: string;
  name: string;
  description?: string;
  status: "ACTIVE" | "INACTIVE";
  required: boolean;
  fields: CustomFormField[];
};

interface FormEditorProps {
  formId: string;
}

export function FormEditor({ formId }: FormEditorProps) {
  const [form, setForm] = useState<CustomForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<CustomFormField | null>(null);
  const [showFieldDialog, setShowFieldDialog] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formRequired, setFormRequired] = useState(false);
  const [formStatus, setFormStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  // Fetch form on mount
  useEffect(() => {
    const fetchForm = async () => {
      try {
        const response = await fetch(`/api/forms/${formId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch form");
        }
        const data = await response.json();
        setForm(data);
        setFormName(data.name);
        setFormDescription(data.description || "");
        setFormRequired(data.required);
        setFormStatus(data.status);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load form");
      } finally {
        setLoading(false);
      }
    };

    fetchForm();
  }, [formId]);

  const handleAddField = () => {
    setEditingField({
      label: "",
      key: "",
      type: "SHORT_TEXT",
      required: false,
      placeholder: "",
      helpText: "",
      options: [],
      order: form?.fields.length || 0,
    });
    setShowFieldDialog(true);
  };

  const handleEditField = (field: CustomFormField) => {
    setEditingField(field);
    setShowFieldDialog(true);
  };

  const handleSaveField = async () => {
    if (!editingField || !form) return;

    try {
      setSaving(true);
      setError(null);

      if (editingField.id) {
        // Update existing field
        const response = await fetch(
          `/api/forms/${formId}/fields/${editingField.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(editingField),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to update field");
        }

        const updatedField = await response.json();
        setForm({
          ...form,
          fields: form.fields.map((f) =>
            f.id === editingField.id ? updatedField : f
          ),
        });
      } else {
        // Add new field
        const response = await fetch(`/api/forms/${formId}/fields`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingField),
        });

        if (!response.ok) {
          throw new Error("Failed to create field");
        }

        const newField = await response.json();
        setForm({
          ...form,
          fields: [...form.fields, newField].sort((a, b) => a.order - b.order),
        });
      }

      setShowFieldDialog(false);
      setEditingField(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save field");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!form || !confirm("Are you sure you want to delete this field?"))
      return;

    try {
      setSaving(true);
      const response = await fetch(`/api/forms/${formId}/fields/${fieldId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete field");
      }

      setForm({
        ...form,
        fields: form.fields.filter((f) => f.id !== fieldId),
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete field");
    } finally {
      setSaving(false);
    }
  };

  const handleMoveField = async (
    fieldId: string,
    direction: "up" | "down"
  ) => {
    if (!form) return;

    const index = form.fields.findIndex((f) => f.id === fieldId);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === form.fields.length - 1)
    )
      return;

    const newFields = [...form.fields];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    // Swap orders
    const temp = newFields[index].order;
    newFields[index].order = newFields[targetIndex].order;
    newFields[targetIndex].order = temp;

    // Re-sort
    newFields.sort((a, b) => a.order - b.order);
    setForm({ ...form, fields: newFields });
  };

  const handleSaveForm = async () => {
    if (!form) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/forms/${formId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          description: formDescription,
          status: formStatus,
          required: formRequired,
          fields: form.fields,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save form");
      }

      const updated = await response.json();
      setForm(updated);
      setError(null);
      alert("Form saved successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save form");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-secondary-foreground">Loading form...</p>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
        <p className="text-destructive">Form not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Form Settings */}
      <div className="overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(77,54,37,0.08)] sm:p-8">
        <div className="mb-6">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-secondary-foreground">
            Settings
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
            Form Details
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Form Name *
            </label>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Enter form name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Description
            </label>
            <Textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Enter form description"
              rows={3}
            />
          </div>

          <div className="flex gap-8">
            <div className="flex items-center gap-2">
              <Checkbox
                id="required"
                checked={formRequired}
                onCheckedChange={(checked) =>
                  setFormRequired(checked as boolean)
                }
              />
              <label
                htmlFor="required"
                className="text-sm font-medium text-foreground cursor-pointer"
              >
                Required for Onboarding
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Status
              </label>
              <Select value={formStatus} onValueChange={(val: any) => setFormStatus(val)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(77,54,37,0.08)] sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-secondary-foreground">
              Content
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
              Form Fields ({form.fields.length})
            </h2>
          </div>
          <Button onClick={handleAddField} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Field
          </Button>
        </div>

        {form.fields.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-secondary-foreground mb-4">No fields yet</p>
            <Button onClick={handleAddField} variant="outline" size="sm">
              Create First Field
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {form.fields.map((field, index) => (
              <div
                key={field.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/20"
              >
                <div className="flex-1">
                  <p className="font-medium text-foreground">{field.label}</p>
                  <p className="text-sm text-secondary-foreground">
                    {field.type} {field.required && "• Required"}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveField(field.id!, "up")}
                    disabled={index === 0}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveField(field.id!, "down")}
                    disabled={index === form.fields.length - 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditField(field)}
                    className="h-8 px-2"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      field.id && handleDeleteField(field.id)
                    }
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          disabled={loading || saving}
          onClick={() => window.history.back()}
        >
          Cancel
        </Button>
        <Button onClick={handleSaveForm} disabled={loading || saving}>
          {saving ? "Saving..." : "Save Form"}
        </Button>
      </div>

      {/* Field Editor Dialog */}
      <Dialog open={showFieldDialog} onOpenChange={setShowFieldDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingField?.id ? "Edit Field" : "Add Field"}
            </DialogTitle>
          </DialogHeader>

          {editingField && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Label *
                </label>
                <Input
                  value={editingField.label}
                  onChange={(e) =>
                    setEditingField({ ...editingField, label: e.target.value })
                  }
                  placeholder="e.g., First Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Field Key *
                </label>
                <Input
                  value={editingField.key}
                  onChange={(e) =>
                    setEditingField({ ...editingField, key: e.target.value })
                  }
                  placeholder="e.g., first_name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Field Type *
                </label>
                <Select
                  value={editingField.type}
                  onValueChange={(value) =>
                    setEditingField({ ...editingField, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Placeholder
                </label>
                <Input
                  value={editingField.placeholder || ""}
                  onChange={(e) =>
                    setEditingField({
                      ...editingField,
                      placeholder: e.target.value,
                    })
                  }
                  placeholder="Enter placeholder text"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Help Text
                </label>
                <Textarea
                  value={editingField.helpText || ""}
                  onChange={(e) =>
                    setEditingField({
                      ...editingField,
                      helpText: e.target.value,
                    })
                  }
                  placeholder="Enter helper text"
                  rows={2}
                />
              </div>

              {["DROPDOWN", "RADIO", "CHECKBOX"].includes(
                editingField.type
              ) && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Options (one per line)
                  </label>
                  <Textarea
                    value={(editingField.options || []).join("\n")}
                    onChange={(e) =>
                      setEditingField({
                        ...editingField,
                        options: e.target.value
                          .split("\n")
                          .filter((opt) => opt.trim()),
                      })
                    }
                    placeholder="Option 1&#10;Option 2&#10;Option 3"
                    rows={3}
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <Checkbox
                  id="field-required"
                  checked={editingField.required}
                  onCheckedChange={(checked) =>
                    setEditingField({
                      ...editingField,
                      required: checked as boolean,
                    })
                  }
                />
                <label
                  htmlFor="field-required"
                  className="text-sm font-medium text-foreground cursor-pointer"
                >
                  Required
                </label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowFieldDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveField}
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? "Saving..." : "Save Field"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
