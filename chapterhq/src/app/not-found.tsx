import Link from "next/link";

export default function NotFound() {
	return (
		<main className="flex min-h-screen items-center justify-center bg-background px-6">
			<div className="max-w-md rounded-2xl border border-border bg-card px-8 py-10 text-center shadow-sm">
				<p className="text-sm font-medium uppercase tracking-[0.28em] text-secondary-foreground">
					ChapterHQ
				</p>
				<h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground">
					Page not found
				</h1>
				<p className="mt-3 text-sm leading-7 text-secondary-foreground">
					The page you are looking for does not exist or has been moved.
				</p>
				<Link
					href="/"
					className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-[#4a3228]"
				>
					Go home
				</Link>
			</div>
		</main>
	);
}
