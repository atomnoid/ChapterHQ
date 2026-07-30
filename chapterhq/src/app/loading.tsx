export default function Loading() {
	return (
		<main className="flex min-h-screen items-center justify-center bg-background px-6">
			<div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
				<div className="h-3 w-24 animate-pulse rounded-full bg-muted" />
				<div className="mt-4 space-y-3">
					<div className="h-8 w-3/4 animate-pulse rounded-xl bg-muted" />
					<div className="h-5 w-full animate-pulse rounded-full bg-muted" />
					<div className="h-5 w-5/6 animate-pulse rounded-full bg-muted" />
				</div>
			</div>
		</main>
	);
}
