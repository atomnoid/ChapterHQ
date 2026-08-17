"use client";

import Link from "next/link";
import { ArrowRight, CircleCheckBig, LayoutDashboard } from "lucide-react";

import { Button } from "@/components/ui/button";

const metrics = [
  { label: "Members", value: "1,248" },
  { label: "Events this term", value: "42" },
  { label: "Attendance rate", value: "96%" },
];

const activity = [
  { label: "New signups", value: "+18" },
  { label: "Pending approvals", value: "07" },
  { label: "Certificates issued", value: "126" },
];

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(circle_at_top_left,rgba(176,137,104,0.12),transparent_42%),radial-gradient(circle_at_top_right,rgba(92,64,51,0.07),transparent_36%)]" />

      <div className="mx-auto grid max-w-7xl gap-14 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:px-8 lg:pb-28 lg:pt-24">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-secondary-foreground shadow-sm">
            <CircleCheckBig className="h-4 w-4 text-[#8a6f5a]" />
            Enterprise-grade platform for student organizations
          </div>

          <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl lg:text-6xl">
            The modern operating system for students.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-secondary-foreground sm:text-xl">
            Manage organizations, members, events, attendance, finance,
            certificates and more - all from one beautifully designed platform.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground shadow-[0_18px_40px_rgba(92,64,51,0.16)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#4a3228]"
            >
              <Link href="/signup">Get Started</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 rounded-full border-border/90 bg-card px-6 text-sm font-medium text-foreground shadow-none transition-transform duration-200 hover:-translate-y-0.5 hover:bg-muted"
            >
              <Link href="#dashboard-preview" className="gap-2">
                View Demo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-2xl border border-border bg-card/90 px-4 py-4 shadow-sm"
              >
                <div className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
                  {metric.value}
                </div>
                <div className="mt-1 text-sm text-secondary-foreground">
                  {metric.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-8 top-10 hidden h-40 w-40 rounded-full border border-[#d8c7b6] bg-[#fffdf8] shadow-[0_10px_40px_rgba(77,54,37,0.06)] lg:block" />
          <div className="absolute -bottom-8 right-4 hidden h-28 w-28 rounded-full border border-border bg-card shadow-[0_12px_32px_rgba(77,54,37,0.06)] lg:block" />

          <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-4 shadow-[0_30px_80px_rgba(77,54,37,0.12)] sm:p-6">
            <div className="flex items-center gap-2 border-b border-border pb-4">
              <span className="h-3 w-3 rounded-full bg-[#d1c2b2]" />
              <span className="h-3 w-3 rounded-full bg-[#bfa78b]" />
              <span className="h-3 w-3 rounded-full bg-[#8a6f5a]" />
              <div className="ml-auto flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-secondary-foreground">
                <LayoutDashboard className="h-3.5 w-3.5" />
                ChapterHQ / Overview
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="rounded-[1.5rem] border border-border bg-[#fcf8f1] p-4">
                <div className="text-sm font-medium text-secondary-foreground">
                  Organization snapshot
                </div>
                <div className="mt-4 space-y-3">
                  {activity.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3"
                    >
                      <span className="text-sm text-secondary-foreground">
                        {item.label}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-[1.4rem] border border-border bg-card p-4 shadow-sm">
                    <div className="text-xs uppercase tracking-[0.24em] text-secondary-foreground">
                      Finance
                    </div>
                    <div className="mt-3 text-2xl font-semibold text-foreground">
                      ₹24.8k
                    </div>
                    <div className="mt-2 text-sm text-secondary-foreground">
                      Total balance
                    </div>
                  </div>
                  <div className="rounded-[1.4rem] border border-border bg-card p-4 shadow-sm">
                    <div className="text-xs uppercase tracking-[0.24em] text-secondary-foreground">
                      Attendance
                    </div>
                    <div className="mt-3 text-2xl font-semibold text-foreground">
                      96%
                    </div>
                    <div className="mt-2 text-sm text-secondary-foreground">
                      Weekly average
                    </div>
                  </div>
                  <div className="rounded-[1.4rem] border border-border bg-card p-4 shadow-sm">
                    <div className="text-xs uppercase tracking-[0.24em] text-secondary-foreground">
                      Certificates
                    </div>
                    <div className="mt-3 text-2xl font-semibold text-foreground">
                      126
                    </div>
                    <div className="mt-2 text-sm text-secondary-foreground">
                      Issued today
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-border bg-card p-4 shadow-sm sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        Upcoming events
                      </div>
                      <div className="mt-1 text-sm text-secondary-foreground">
                        Weekly planning and member activity
                      </div>
                    </div>
                    <div className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-secondary-foreground">
                      This month
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {[
                      ["Board review", "Tomorrow • 6:30 PM", "88%"],
                      ["Open house", "Friday • 4:00 PM", "72%"],
                      ["Alumni mixer", "Next week • 7:00 PM", "64%"],
                    ].map(([title, time, value]) => (
                      <div
                        key={title}
                        className="grid gap-3 rounded-2xl border border-border bg-[#fcf8f1] px-4 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                      >
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {title}
                          </div>
                          <div className="mt-1 text-sm text-secondary-foreground">
                            {time}
                          </div>
                        </div>
                        <div className="h-2 w-full rounded-full bg-[#eadfce] sm:w-28">
                          <div
                            className="h-2 rounded-full bg-[#b08968]"
                            style={{ width: value }}
                          />
                        </div>
                        <div className="text-sm font-semibold text-foreground">
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
