"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
	Bell,
	Building2,
	CalendarDays,
	ChevronDown,
	DollarSign,
	FileText,
	LayoutDashboard,
	LogOut,
	Menu,
	Search,
	Settings,
	Shield,
	Users,
	X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { DashboardLogoutButton } from "@/features/auth/components/dashboard-logout-button";
import { cn } from "@/lib/utils";
import { GlobalSearchInput } from "@/features/dashboard/components/global-search-input";

type DashboardUser = {
	name: string | null;
	email: string | null;
	image: string | null;
};

type DashboardShellProps = Readonly<{
	children: React.ReactNode;
	user: DashboardUser | null;
}>;

const navigationItems = [
	{ label: "Overview", href: "/dashboard", icon: LayoutDashboard },
	{ label: "Members", href: "/members", icon: Users },
	{ label: "Roles", href: "/roles", icon: Shield },
	{ label: "Organizations", href: "/organizations", icon: Building2 },
	{ label: "Calendar", href: "/dashboard#calendar", icon: CalendarDays },
	{ label: "Finance", href: "/dashboard#finance", icon: DollarSign },
	{ label: "Documents", href: "/dashboard#documents", icon: FileText },
];

function getInitials(name: string | null) {
	if (!name) {
		return "CH";
	}

	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) {
		return "CH";
	}

	return parts
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? "")
		.join("");
}

export function DashboardShell({ children, user }: DashboardShellProps) {
	const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
	const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

	const displayName = useMemo(() => user?.name?.trim() || "ChapterHQ member", [user]);
	const displayEmail = useMemo(() => user?.email?.trim() || "Signed in account", [user]);
	const initials = useMemo(() => getInitials(user?.name ?? null), [user]);

	return (
		<div className="min-h-screen bg-[linear-gradient(180deg,#f8f4ec_0%,#fbf8f2_40%,#f8f4ec_100%)] text-foreground">
			<div className="mx-auto flex min-h-screen max-w-[1800px]">
				<aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-border/80 bg-card/95 px-5 py-6 shadow-[10px_0_40px_rgba(77,54,37,0.04)] backdrop-blur-xl lg:flex lg:flex-col">
					<Link href="/dashboard" className="flex items-center gap-3 rounded-2xl px-2 py-1">
						<span className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-sm font-semibold tracking-[0.24em] shadow-[0_10px_25px_rgba(77,54,37,0.06)]">
							C
						</span>
						<span>
							<span className="block text-sm font-semibold uppercase tracking-[0.24em] text-foreground">
								ChapterHQ
							</span>
							<span className="mt-1 block text-xs uppercase tracking-[0.28em] text-secondary-foreground">
								Organization workspace
							</span>
						</span>
					</Link>

					<nav className="mt-10 space-y-1">
						{navigationItems.map((item) => {
							const Icon = item.icon;

							return (
								<Link
									key={item.label}
									href={item.href}
									className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary hover:text-foreground"
								>
									<Icon className="h-4 w-4" />
									<span>{item.label}</span>
								</Link>
							);
						})}
					</nav>

					<div className="mt-auto rounded-[1.5rem] border border-border bg-[#fcf8f1] p-4 shadow-[0_16px_40px_rgba(77,54,37,0.06)]">
						<p className="text-xs font-medium uppercase tracking-[0.24em] text-secondary-foreground">
							Workspace status
						</p>
						<div className="mt-3 flex items-center justify-between gap-3">
							<div>
								<p className="text-sm font-semibold text-foreground">All systems ready</p>
								<p className="mt-1 text-xs leading-5 text-secondary-foreground">
									Your dashboard foundation is live and ready for feature modules.
								</p>
							</div>
							<span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
								OK
							</span>
						</div>
					</div>
				</aside>

				<div className="flex min-w-0 flex-1 flex-col">
					<header className="sticky top-0 z-30 border-b border-border/80 bg-background/85 backdrop-blur-xl">
						<div className="flex items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
							<Button
								type="button"
								variant="outline"
								size="icon"
								className="rounded-full border-border bg-card lg:hidden"
								onClick={() => setIsMobileSidebarOpen(true)}
								aria-label="Open navigation menu"
							>
								<Menu className="h-4 w-4" />
							</Button>

							<div className="min-w-0 flex-1">
								<p className="text-xs font-medium uppercase tracking-[0.26em] text-secondary-foreground">
									ChapterHQ dashboard
								</p>
								<h1 className="mt-1 truncate text-lg font-semibold tracking-[-0.03em] text-foreground sm:text-xl">
									Main workspace
								</h1>
							</div>

							<div className="hidden min-w-[18rem] max-w-md flex-1 lg:block">
								<GlobalSearchInput />
							</div>

							<div className="ml-auto flex items-center gap-2">
								<Button
									type="button"
									variant="outline"
									size="icon"
									className="rounded-full border-border bg-card text-foreground"
									aria-label="Notifications"
								>
									<Bell className="h-4 w-4" />
								</Button>

								<div className="relative">
									<Button
										type="button"
										variant="outline"
										className="h-11 rounded-full border-border bg-card px-3 text-left text-foreground shadow-none"
										onClick={() => setIsProfileMenuOpen((value) => !value)}
										aria-expanded={isProfileMenuOpen}
										aria-haspopup="menu"
									>
										<span className="flex items-center gap-3">
											<span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary text-xs font-semibold text-primary-foreground">
												{user?.image ? (
													<img src={user.image} alt="User avatar" className="h-full w-full object-cover" />
												) : (
													initials
												)}
											</span>
											<span className="hidden text-left sm:block">
												<span className="block max-w-40 truncate text-sm font-medium text-foreground">
													{displayName}
												</span>
												<span className="block max-w-40 truncate text-xs text-secondary-foreground">
													{displayEmail}
												</span>
											</span>
											<ChevronDown className="h-4 w-4 text-secondary-foreground" />
										</span>
									</Button>

									{isProfileMenuOpen ? (
										<div className="absolute right-0 top-[calc(100%+0.75rem)] w-72 overflow-hidden rounded-3xl border border-border bg-card p-2 shadow-[0_18px_50px_rgba(77,54,37,0.12)]">
											<div className="rounded-2xl bg-[#fcf8f1] px-4 py-4">
												<p className="text-sm font-semibold text-foreground">{displayName}</p>
												<p className="mt-1 text-xs leading-5 text-secondary-foreground">{displayEmail}</p>
											</div>

											<div className="mt-2 space-y-1">
												<button
													type="button"
													className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary hover:text-foreground"
													onClick={() => setIsProfileMenuOpen(false)}
												>
													<Settings className="h-4 w-4" />
													<span>Account settings</span>
												</button>

												<div onClick={() => setIsProfileMenuOpen(false)}>
													<DashboardLogoutButton>
														<LogOut className="h-4 w-4" />
														Logout
													</DashboardLogoutButton>
												</div>
											</div>
										</div>
									) : null}
								</div>
							</div>
                        </div>
					</header>

						<div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
							<main className="mx-auto w-full max-w-7xl">{children}</main>
						</div>
					</div>
				

				<div
					className={cn(
						"fixed inset-0 z-40 bg-foreground/35 backdrop-blur-[2px] transition-opacity lg:hidden",
						isMobileSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
					)}
					onClick={() => setIsMobileSidebarOpen(false)}
				/>

				<aside
					className={cn(
						"fixed inset-y-0 left-0 z-50 w-[min(86vw,20rem)] border-r border-border bg-card px-5 py-6 shadow-[18px_0_45px_rgba(77,54,37,0.12)] transition-transform duration-300 ease-out lg:hidden",
						isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
					)}
				>
					<div className="flex items-center justify-between">
						<Link
							href="/dashboard"
							className="flex items-center gap-3 rounded-2xl px-1 py-1"
							onClick={() => setIsMobileSidebarOpen(false)}
						>
							<span className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-sm font-semibold tracking-[0.24em]">
								C
							</span>
							<span className="text-sm font-semibold uppercase tracking-[0.24em]">ChapterHQ</span>
						</Link>

						<Button
							type="button"
							variant="outline"
							size="icon"
							className="rounded-full border-border bg-card"
							onClick={() => setIsMobileSidebarOpen(false)}
							aria-label="Close navigation menu"
						>
							<X className="h-4 w-4" />
						</Button>
					</div>

					<div className="mt-6 rounded-[1.5rem] border border-border bg-[#fcf8f1] p-4">
						<p className="text-xs font-medium uppercase tracking-[0.24em] text-secondary-foreground">
							Signed in as
						</p>
						<p className="mt-2 text-sm font-semibold text-foreground">{displayName}</p>
						<p className="mt-1 text-xs leading-5 text-secondary-foreground">{displayEmail}</p>
					</div>

					<nav className="mt-8 space-y-1">
						{navigationItems.map((item) => {
							const Icon = item.icon;

							return (
								<Link
									key={item.label}
									href={item.href}
									className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary hover:text-foreground"
									onClick={() => setIsMobileSidebarOpen(false)}
								>
									<Icon className="h-4 w-4" />
									<span>{item.label}</span>
									<ChevronDown className="ml-auto h-3.5 w-3.5 -rotate-90 text-secondary-foreground" />
								</Link>
							);
						})}
					</nav>

					<div className="mt-auto space-y-3 pt-6">
						<Button
							type="button"
							variant="outline"
							className="h-11 w-full rounded-full border-border bg-card text-foreground"
							onClick={() => setIsMobileSidebarOpen(false)}
						>
							<Search className="mr-2 h-4 w-4" />
							Search workspace
						</Button>

						<div onClick={() => setIsMobileSidebarOpen(false)}>
							<DashboardLogoutButton>
								<LogOut className="h-4 w-4" />
								Logout
							</DashboardLogoutButton>
						</div>
					</div>
				</aside>
			</div>
		</div>
	);
}