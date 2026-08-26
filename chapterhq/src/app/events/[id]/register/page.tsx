"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Calendar, MapPin, Clock, CheckCircle, AlertTriangle, Download, ClipboardX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface FormField {
  id: string;
  label: string;
  key: string;
  type: string;
  required: boolean;
  placeholder?: string | null;
  helpText?: string | null;
  options?: any;
}

interface EventInfo {
  id: string;
  title: string;
  description: string | null;
  venue: string | null;
  startDate: string;
  endDate: string | null;
  status: string;
  capacity: number | null;
  registrationRequired: boolean;
  customForm?: {
    id: string;
    name: string;
    description?: string | null;
    fields: FormField[];
  } | null;
}

interface RegistrationResult {
  token: string;
  name: string;
}

type PageState =
  | { type: "loading" }
  | { type: "error"; message: string }
  | { type: "form" }
  | { type: "success"; result: RegistrationResult };

export default function PublicRegisterPage() {
  const params = useParams();
  const eventId = params?.id as string;

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [pageState, setPageState] = useState<PageState>({ type: "loading" });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [usn, setUsn] = useState("");
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchEvent = useCallback(async () => {
    setPageState({ type: "loading" });
    try {
      const res = await fetch(`/api/events/${eventId}/public-register`);
      const json = await res.json();
      if (!res.ok) {
        setPageState({ type: "error", message: json.message ?? "Event not found." });
        return;
      }
      const evt = json?.data ?? json;
      if (evt.status !== "PUBLISHED") {
        setPageState({ type: "error", message: "Registration is not open for this event." });
        return;
      }
      setEvent(evt);
      setPageState({ type: "form" });
    } catch {
      setPageState({ type: "error", message: "Failed to load event. Please try again." });
    }
  }, [eventId]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const hasCustomForm = !!(event?.customForm?.fields && event.customForm.fields.length > 0);

    // Only require name/email when there's no custom form
    if (!hasCustomForm && (!name.trim() || !email.trim())) {
      setFormError("Name and email are required.");
      return;
    }

    // Custom form field validations
    if (hasCustomForm && event?.customForm?.fields) {
      for (const field of event.customForm.fields) {
        if (field.required && !answers[field.key]) {
          setFormError(`"${field.label}" is required.`);
          return;
        }
      }
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const hasCustomForm = !!(event?.customForm?.fields && event.customForm.fields.length > 0);
      const payload: any = {};

      if (hasCustomForm) {
        // Only send customAnswers — name/email resolved server-side from answers
        payload.customAnswers = answers;
      } else {
        // No custom form: send traditional fields
        payload.name = name.trim();
        payload.email = email.trim();
        payload.phone = phone.trim() || undefined;
        payload.usn = usn.trim() || undefined;
      }

      const res = await fetch(`/api/events/${eventId}/public-register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        setFormError(json.message ?? "Registration failed. Please try again.");
        return;
      }

      const data = json?.data ?? json;
      let token: string | undefined;
      let participantName = name;

      if (data?.type === "member" && data?.registration?.checkInToken) {
        token = data.registration.checkInToken;
      } else if (data?.type === "external" && data?.registration?.checkInToken) {
        token = data.registration.checkInToken;
      } else if (data?.registration?.checkInToken) {
        token = data.registration.checkInToken;
      }

      if (!token) {
        setFormError("Registration succeeded but could not retrieve your QR token. Please contact the organizer.");
        return;
      }

      setPageState({ type: "success", result: { token, name: participantName } });
    } catch {
      setFormError("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const handleInputChange = (key: string, val: any) => {
    setAnswers((prev) => ({ ...prev, [key]: val }));
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const renderCustomField = (field: FormField) => {
    const value = answers[field.key] ?? "";
    const isRequired = field.required;

    switch (field.type) {
      case "LONG_TEXT":
        return (
          <div key={field.id} className="space-y-1.5">
            <Label htmlFor={field.key}>
              {field.label} {isRequired && <span className="text-destructive font-bold">*</span>}
            </Label>
            <Textarea
              id={field.key}
              placeholder={field.placeholder ?? ""}
              value={value}
              onChange={(e) => handleInputChange(field.key, e.target.value)}
              required={isRequired}
              disabled={submitting}
              className="min-h-[80px]"
            />
          </div>
        );

      case "DROPDOWN":
        const selectOptions = Array.isArray(field.options) ? field.options : [];
        return (
          <div key={field.id} className="space-y-1.5">
            <Label htmlFor={field.key}>
              {field.label} {isRequired && <span className="text-destructive font-bold">*</span>}
            </Label>
            <Select
              value={value}
              onValueChange={(val) => handleInputChange(field.key, val)}
              disabled={submitting}
            >
              <SelectTrigger id={field.key}>
                <SelectValue placeholder={field.placeholder || "Select option"} />
              </SelectTrigger>
              <SelectContent>
                {selectOptions.map((opt: any) => {
                  const optLabel = typeof opt === "string" ? opt : opt.label;
                  const optVal = typeof opt === "string" ? opt : opt.value;
                  return (
                    <SelectItem key={optVal} value={optVal}>
                      {optLabel}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        );

      case "YES_NO":
        return (
          <div key={field.id} className="flex items-center space-x-2 pt-2">
            <Checkbox
              id={field.key}
              checked={!!value}
              onCheckedChange={(checked) => handleInputChange(field.key, !!checked)}
              disabled={submitting}
            />
            <Label htmlFor={field.key} className="select-none cursor-pointer">
              {field.label} {isRequired && <span className="text-destructive font-bold">*</span>}
            </Label>
          </div>
        );

      case "CHECKBOX":
        const checkOptions = Array.isArray(field.options) ? field.options : [];
        const currentChecks = Array.isArray(value) ? value : [];
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.label} {isRequired && <span className="text-destructive font-bold">*</span>}
            </Label>
            <div className="grid gap-2">
              {checkOptions.map((opt: any) => {
                const optLabel = typeof opt === "string" ? opt : opt.label;
                const optVal = typeof opt === "string" ? opt : opt.value;
                const checked = currentChecks.includes(optVal);

                return (
                  <div key={optVal} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${field.key}-${optVal}`}
                      checked={checked}
                      onCheckedChange={(isChecked) => {
                        const nextChecks = isChecked
                          ? [...currentChecks, optVal]
                          : currentChecks.filter((c) => c !== optVal);
                        handleInputChange(field.key, nextChecks);
                      }}
                      disabled={submitting}
                    />
                    <Label htmlFor={`${field.key}-${optVal}`} className="select-none cursor-pointer text-sm">
                      {optLabel}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case "RADIO":
        const radioOptions = Array.isArray(field.options) ? field.options : [];
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.label} {isRequired && <span className="text-destructive font-bold">*</span>}
            </Label>
            <div className="grid gap-2">
              {radioOptions.map((opt: any) => {
                const optLabel = typeof opt === "string" ? opt : opt.label;
                const optVal = typeof opt === "string" ? opt : opt.value;

                return (
                  <div key={optVal} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id={`${field.key}-${optVal}`}
                      name={field.key}
                      checked={value === optVal}
                      onChange={() => handleInputChange(field.key, optVal)}
                      disabled={submitting}
                      className="h-4 w-4 text-primary focus:ring-primary border-border"
                    />
                    <Label htmlFor={`${field.key}-${optVal}`} className="select-none cursor-pointer text-sm">
                      {optLabel}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        );

      default:
        // SHORT_TEXT, EMAIL, PHONE, NUMBER, DATE
        let inputType = "text";
        if (field.type === "EMAIL") inputType = "email";
        if (field.type === "PHONE") inputType = "tel";
        if (field.type === "NUMBER") inputType = "number";
        if (field.type === "DATE") inputType = "date";

        return (
          <div key={field.id} className="space-y-1.5">
            <Label htmlFor={field.key}>
              {field.label} {isRequired && <span className="text-destructive font-bold">*</span>}
            </Label>
            <Input
              id={field.key}
              type={inputType}
              placeholder={field.placeholder ?? ""}
              value={value}
              onChange={(e) => handleInputChange(field.key, e.target.value)}
              required={isRequired}
              disabled={submitting}
            />
          </div>
        );
    }
  };

  if (pageState.type === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-secondary-foreground">Loading event...</p>
        </div>
      </div>
    );
  }

  if (pageState.type === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-4 rounded-[2rem] border border-border bg-card p-8 shadow-lg">
          <span className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </span>
          <h1 className="text-xl font-bold text-foreground">Registration Unavailable</h1>
          <p className="text-sm text-secondary-foreground">{pageState.message}</p>
        </div>
      </div>
    );
  }

  if (pageState.type === "success") {
    const { token, name: participantName } = pageState.result;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(token)}`;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full rounded-[2rem] border border-border bg-card shadow-[0_20px_60px_rgba(0,0,0,0.08)] p-8 space-y-6 text-center">
          <span className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle className="h-7 w-7 text-emerald-600" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              You&apos;re Registered!
            </h1>
            <p className="text-sm text-secondary-foreground mt-1">
              Welcome, <strong>{participantName}</strong>. Show this QR code to the coordinator during the event to mark your attendance.
            </p>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="rounded-2xl border border-border p-4 bg-white inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrUrl}
                alt="Your event check-in QR code"
                className="h-[200px] w-[200px]"
              />
            </div>
            <Button
              variant="default"
              size="sm"
              className="gap-1.5 font-semibold"
              onClick={async () => {
                const downloadUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(token)}`;
                try {
                  const response = await fetch(downloadUrl);
                  const blob = await response.blob();
                  const blobUrl = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = blobUrl;
                  link.download = `checkin-qr-${participantName.replace(/\s+/g, "-").toLowerCase()}.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(blobUrl);
                } catch {
                  window.open(downloadUrl, "_blank");
                }
              }}
            >
              <Download className="h-4 w-4" />
              Download QR Code
            </Button>
            <p className="text-xs text-secondary-foreground">
              Save this QR code for entry at the event.
            </p>
          </div>

          {event && (
            <div className="rounded-2xl border border-border bg-background p-4 text-left space-y-2">
              <p className="text-sm font-semibold text-foreground">{event.title}</p>
              {event.venue && (
                <p className="flex items-center gap-2 text-xs text-secondary-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {event.venue}
                </p>
              )}
              <p className="flex items-center gap-2 text-xs text-secondary-foreground">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                {formatDate(event.startDate)}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Event Header */}
        {event && (
          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-secondary-foreground">
              <Calendar className="h-4 w-4" />
              Event Registration
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{event.title}</h1>
            {event.description && (
              <p className="text-sm text-secondary-foreground leading-relaxed">{event.description}</p>
            )}
            <div className="flex flex-wrap gap-3 text-xs text-secondary-foreground">
              {event.venue && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {event.venue}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {formatDate(event.startDate)}
              </span>
            </div>
          </div>
        )}

        {/* Registration Form */}
        {event?.customForm?.fields && event.customForm.fields.length > 0 ? (
          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {event.customForm.name || "Registration Form"}
              </h2>
              {event.customForm.description && (
                <p className="text-sm text-secondary-foreground mt-1">{event.customForm.description}</p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {event.customForm.fields.map((field) => renderCustomField(field))}

              {formError && (
                <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {formError}
                </div>
              )}

              <Button type="submit" className="w-full rounded-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Registering...
                  </>
                ) : (
                  <>
                    <svg
                      className="h-4 w-4 mr-2"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="5" height="5" x="3" y="3" rx="1" />
                      <rect width="5" height="5" x="16" y="3" rx="1" />
                      <rect width="5" height="5" x="3" y="16" rx="1" />
                      <path d="M21 16V21H16" />
                      <path d="M21 12H16V16" />
                      <path d="M12 21V16H16" />
                      <path d="M12 12H16" />
                      <path d="M12 3V12" />
                      <path d="M3 12H12" />
                    </svg>
                    Register &amp; Get My QR Code
                  </>
                )}
              </Button>
            </form>
          </div>
        ) : (
          // No custom form configured — show informational notice
          <div className="rounded-[2rem] border border-border bg-card p-8 shadow-sm flex flex-col items-center text-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary/30">
              <ClipboardX className="h-6 w-6 text-secondary-foreground" />
            </span>
            <div className="space-y-1.5">
              <h2 className="text-base font-semibold text-foreground">Registration Form Not Set Up</h2>
              <p className="text-sm text-secondary-foreground leading-relaxed max-w-sm">
                The admin has not configured a registration form for this event yet. Please contact the event organiser or check back later.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

