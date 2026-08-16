"use client";

import { useState, useEffect } from "react";
import { FormSubmitter } from "@/features/forms/components/form-submitter";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type OnboardingStatus = {
  isOnboarded: boolean;
  requiredForms: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
  completedForms: string[];
  incompleteRequired: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
};

export function MemberOnboardingForm() {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentFormIndex, setCurrentFormIndex] = useState(0);

  // Fetch onboarding status on mount
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch("/api/member/onboarding-forms");
        if (!response.ok) {
          let errMsg = `Request failed (${response.status})`;
          try {
            const errJson = await response.json();
            errMsg = errJson?.message ?? errMsg;
          } catch {
            // non-JSON response (e.g. HTML redirect)
            errMsg = `Unexpected response (${response.status} ${response.statusText}). The server may have redirected — try refreshing.`;
          }
          throw new Error(errMsg);
        }
        const data = await response.json();
        setStatus(data);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load onboarding forms"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, []);

  const handleFormSubmitSuccess = () => {
    // Refresh status after successful submission
    const fetchStatus = async () => {
      try {
        const response = await fetch("/api/member/onboarding-forms");
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
          // If all forms complete, move to index -1 to show success
          if (data.isOnboarded) {
            setCurrentFormIndex(-1);
          } else {
            // Move to next incomplete form
            setCurrentFormIndex((prev) => prev + 1);
          }
        }
      } catch (err) {
        console.error("Failed to refresh status:", err);
      }
    };

    fetchStatus();
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-8">
        <div className="overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(77,54,37,0.08)] sm:p-8">
          <div className="flex items-center justify-center py-12">
            <p className="text-secondary-foreground">Loading your onboarding forms...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 pb-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="space-y-6 pb-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Unable to load onboarding status</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Already onboarded
  if (status.isOnboarded && status.incompleteRequired.length === 0) {
    return (
      <div className="space-y-6 pb-8">
        <div className="overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(77,54,37,0.08)] sm:p-8">
          <div className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              You're All Set!
            </h2>
            <p className="text-secondary-foreground mb-6 text-center">
              You've completed all required onboarding forms. Welcome to the team!
            </p>
            <Button onClick={() => (window.location.href = "/dashboard")}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show completion success
  if (currentFormIndex === -1) {
    return (
      <div className="space-y-6 pb-8">
        <div className="overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(77,54,37,0.08)] sm:p-8">
          <div className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              All Done!
            </h2>
            <p className="text-secondary-foreground mb-6 text-center">
              You've successfully completed all required onboarding forms.
            </p>
            <Button onClick={() => (window.location.href = "/dashboard")}>
              Continue to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show forms
  const incompleteForm = status.incompleteRequired[currentFormIndex];

  if (!incompleteForm) {
    return (
      <div className="space-y-6 pb-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No more incomplete forms to display</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Progress Header */}
      <div className="overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(77,54,37,0.08)] sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-secondary-foreground">
          Onboarding Progress
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
          Form {currentFormIndex + 1} of {status.incompleteRequired.length}
        </h2>
        <div className="mt-4 w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{
              width: `${((currentFormIndex + 1) / status.incompleteRequired.length) * 100}%`,
            }}
          />
        </div>

        {/* Completed Forms List */}
        {status.completedForms.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-medium text-secondary-foreground mb-2">
              Completed:
            </p>
            <div className="flex flex-wrap gap-2">
              {status.requiredForms
                .filter((f) => status.completedForms.includes(f.id))
                .map((form) => (
                  <div
                    key={form.id}
                    className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {form.name}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Form Card */}
      <div className="overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(77,54,37,0.08)] sm:p-8">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-foreground">
            {incompleteForm.name}
          </h3>
          {incompleteForm.description && (
            <p className="mt-2 text-secondary-foreground">
              {incompleteForm.description}
            </p>
          )}
        </div>

        {/* Form Submitter */}
        <FormSubmitter
          formId={incompleteForm.id}
          onSubmitSuccess={handleFormSubmitSuccess}
        />
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-2 justify-between">
        <Button
          variant="outline"
          onClick={() => {
            if (currentFormIndex > 0) {
              setCurrentFormIndex(currentFormIndex - 1);
            }
          }}
          disabled={currentFormIndex === 0}
        >
          Previous Form
        </Button>

        <Button
          variant="outline"
          onClick={() => (window.location.href = "/dashboard")}
        >
          Exit Onboarding
        </Button>
      </div>
    </div>
  );
}
