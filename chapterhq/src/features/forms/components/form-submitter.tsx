"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FormField {
  id: string;
  label: string;
  key: string;
  type: string;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: Array<{ label: string; value: string }>;
}

interface CustomForm {
  id: string;
  name: string;
  description?: string;
  fields: FormField[];
}

interface FormSubmitterProps {
  formId: string;
  onSuccess?: () => void;
}

export function FormSubmitter({ formId, onSuccess }: FormSubmitterProps) {
  const [form, setForm] = useState<CustomForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const response = await fetch(`/api/forms/${formId}`);
        if (!response.ok) throw new Error("Failed to load form");
        const data = await response.json();
        setForm(data);
        // Initialize form data
        const initial: Record<string, any> = {};
        data.fields.forEach((field: FormField) => {
          if (field.type === "CHECKBOX") {
            initial[field.key] = [];
          } else {
            initial[field.key] = "";
          }
        });
        setFormData(initial);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load form");
      } finally {
        setLoading(false);
      }
    };

    fetchForm();
  }, [formId]);

  const handleChange = (fieldKey: string, value: any, type: string) => {
    if (type === "CHECKBOX") {
      setFormData((prev) => ({
        ...prev,
        [fieldKey]: Array.isArray(prev[fieldKey])
          ? prev[fieldKey].includes(value)
            ? prev[fieldKey].filter((v: any) => v !== value)
            : [...prev[fieldKey], value]
          : [value],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [fieldKey]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation
    const errors: string[] = [];
    form?.fields.forEach((field) => {
      const value = formData[field.key];
      if (field.required && (!value || (Array.isArray(value) && value.length === 0))) {
        errors.push(`"${field.label}" is required`);
      }
    });

    if (errors.length > 0) {
      setError(errors.join(", "));
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch(`/api/forms/${formId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: formData }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to submit form");
      }

      setSubmitted(true);
      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit form");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-destructive mb-3" />
        <p className="text-sm text-destructive">{error || "Form not found"}</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center max-w-lg mx-auto space-y-4">
        <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
        <div>
          <h3 className="font-semibold text-green-900 mb-1">Form Submitted Successfully</h3>
          <p className="text-sm text-green-700">Thank you! You can now access the full dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold">{form.name}</h2>
          {form.description && (
            <p className="mt-2 text-secondary-foreground">{form.description}</p>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {form.fields.map((field) => (
          <div key={field.id} className="space-y-2">
            <label htmlFor={field.key} className="block font-medium">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>

            {field.helpText && (
              <p className="text-xs text-secondary-foreground">{field.helpText}</p>
            )}

            {field.type === "SHORT_TEXT" && (
              <input
                type="text"
                id={field.key}
                value={formData[field.key] || ""}
                onChange={(e) => handleChange(field.key, e.target.value, field.type)}
                placeholder={field.placeholder}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                disabled={submitting}
              />
            )}

            {field.type === "LONG_TEXT" && (
              <textarea
                id={field.key}
                value={formData[field.key] || ""}
                onChange={(e) => handleChange(field.key, e.target.value, field.type)}
                placeholder={field.placeholder}
                rows={4}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                disabled={submitting}
              />
            )}

            {field.type === "EMAIL" && (
              <input
                type="email"
                id={field.key}
                value={formData[field.key] || ""}
                onChange={(e) => handleChange(field.key, e.target.value, field.type)}
                placeholder={field.placeholder}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                disabled={submitting}
              />
            )}

            {field.type === "PHONE" && (
              <input
                type="tel"
                id={field.key}
                value={formData[field.key] || ""}
                onChange={(e) => handleChange(field.key, e.target.value, field.type)}
                placeholder={field.placeholder}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                disabled={submitting}
              />
            )}

            {field.type === "NUMBER" && (
              <input
                type="number"
                id={field.key}
                value={formData[field.key] || ""}
                onChange={(e) => handleChange(field.key, e.target.value, field.type)}
                placeholder={field.placeholder}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                disabled={submitting}
              />
            )}

            {field.type === "DATE" && (
              <input
                type="date"
                id={field.key}
                value={formData[field.key] || ""}
                onChange={(e) => handleChange(field.key, e.target.value, field.type)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                disabled={submitting}
              />
            )}

            {field.type === "DROPDOWN" && (
              <select
                id={field.key}
                value={formData[field.key] || ""}
                onChange={(e) => handleChange(field.key, e.target.value, field.type)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                disabled={submitting}
              >
                <option value="">Select an option</option>
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}

            {field.type === "RADIO" && (
              <div className="space-y-2">
                {field.options?.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={field.key}
                      value={opt.value}
                      checked={formData[field.key] === opt.value}
                      onChange={() => handleChange(field.key, opt.value, field.type)}
                      disabled={submitting}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            )}

            {field.type === "CHECKBOX" && (
              <div className="space-y-2">
                {field.options?.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      value={opt.value}
                      checked={(formData[field.key] || []).includes(opt.value)}
                      onChange={() => handleChange(field.key, opt.value, field.type)}
                      disabled={submitting}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            )}

            {field.type === "YES_NO" && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={field.key}
                    value="yes"
                    checked={formData[field.key] === "yes"}
                    onChange={() => handleChange(field.key, "yes", field.type)}
                    disabled={submitting}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Yes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={field.key}
                    value="no"
                    checked={formData[field.key] === "no"}
                    onChange={() => handleChange(field.key, "no", field.type)}
                    disabled={submitting}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">No</span>
                </label>
              </div>
            )}
          </div>
        ))}

        <div className="flex gap-2 pt-4">
          <Button
            type="submit"
            disabled={submitting}
            className="gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit Form
          </Button>
        </div>
      </form>
    </div>
  );
}
