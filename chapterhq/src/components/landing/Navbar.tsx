import Link from "next/link";

import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "About", href: "#about" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="#top" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-sm font-semibold tracking-[0.24em] text-foreground shadow-[0_10px_25px_rgba(77,54,37,0.06)]">
            C
          </span>
          <span className="text-sm font-semibold tracking-[0.22em] text-foreground uppercase">
            ChapterHQ
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm font-medium text-secondary-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="hidden rounded-full border-border/80 bg-card px-4 text-sm text-foreground shadow-none hover:bg-muted sm:inline-flex"
          >
            <Link href="/login">Login</Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="rounded-full bg-primary px-4 text-sm text-primary-foreground shadow-[0_14px_30px_rgba(92,64,51,0.16)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#4a3228]"
          >
            <Link href="/onboarding">Get Started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
