"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center bg-gray-50 text-gray-900">
          <h1 className="text-6xl font-extrabold tracking-tight text-red-600">500</h1>
          <h2 className="mt-4 text-2xl font-bold tracking-tight">Critical System Error</h2>
          <p className="mt-2 text-gray-600 max-w-md">
            A critical error prevented the page from rendering properly.
          </p>
          <div className="mt-6 flex gap-4">
            <button
              onClick={() => reset()}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
