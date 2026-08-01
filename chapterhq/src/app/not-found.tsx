import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center bg-background text-foreground">
      <h1 className="text-6xl font-extrabold tracking-tight text-primary">404</h1>
      <h2 className="mt-4 text-2xl font-bold tracking-tight">Page Not Found</h2>
      <p className="mt-2 text-muted-foreground max-w-md">
        Sorry, we couldn&apos;t find the page you are looking for. It might have been moved or deleted.
      </p>
      <div className="mt-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md shadow hover:bg-primary/90 transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
