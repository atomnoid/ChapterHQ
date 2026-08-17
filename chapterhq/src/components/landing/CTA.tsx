import Link from "next/link";

import { Button } from "@/components/ui/button";

export function CTA() {
  return (
    <section id="pricing" className="px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[2rem] border border-border bg-card px-6 py-14 text-center shadow-[0_24px_60px_rgba(77,54,37,0.08)] sm:px-10 sm:py-16">
          <div className="mx-auto max-w-2xl">
            <div className="text-sm font-medium uppercase tracking-[0.34em] text-secondary-foreground">
              Get started
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
              Ready to modernize your organization?
            </h2>
            <p className="mt-4 text-lg leading-8 text-secondary-foreground">
              Launch a ChapterHQ workspace and bring every part of your chapter
              into one premium operating system.
            </p>
          </div>

          <Button
            asChild
            size="lg"
            className="mt-8 h-12 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground shadow-[0_18px_40px_rgba(92,64,51,0.16)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#4a3228]"
          >
            <Link href="/signup">Get Started</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
