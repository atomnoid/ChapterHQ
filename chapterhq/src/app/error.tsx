"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled Application Error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center bg-background text-foreground">
      <h1 className="text-6xl font-extrabold tracking-tight text-destructive">500</h1>
      <h2 className="mt-4 text-2xl font-bold tracking-tight">Something Went Wrong</h2>
      <p className="mt-2 text-muted-foreground max-w-md">
        An unexpected error occurred. Please try again or contact support if the issue persists.
      </p>
      <div className="mt-6 flex gap-4">
        <button
          onClick={() => reset()}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md shadow hover:bg-primary/90 transition-colors"
        >
          Try Again
        </button>
        <a
          href="/dashboard"
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium border border-input rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          Return to Dashboard
        </a>
      </div>
    </div>
  );
}
