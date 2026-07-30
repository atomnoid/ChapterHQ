"use client";

import { useEffect } from "react";

export default function Error({
	error,
	reset,
}: Readonly<{
	error: Error & { digest?: string };
	reset: () => void;
}>) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<html lang="en">
			<body>
				<main className="flex min-h-screen items-center justify-center bg-[#f8f4ec] px-6">
					<div className="max-w-md rounded-2xl border border-[#e8ded2] bg-[#fffdf8] p-8 text-center shadow-sm">
						<p className="text-sm font-medium uppercase tracking-[0.28em] text-[#6f6255]">
							ChapterHQ
						</p>
						<h1 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-[#2d241b]">
							Something went wrong.
						</h1>
						<p className="mt-3 text-sm leading-7 text-[#6f6255]">
							We could not load this page. Please try again.
						</p>
						<button
							type="button"
							onClick={reset}
							className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[#5c4033] px-5 text-sm font-medium text-[#fffdf8] transition-colors hover:bg-[#4a3228]"
						>
							Try again
						</button>
					</div>
				</main>
			</body>
		</html>
	);
}
