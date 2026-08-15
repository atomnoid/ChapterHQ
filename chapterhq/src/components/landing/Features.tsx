"use client";

import {
  BadgeCheck,
  BarChart3,
  CalendarDays,
  Landmark,
  Users,
  Wallet,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Member Management",
    description:
      "Track profiles, committees, roles, and organizational history from one central workspace.",
  },
  {
    icon: CalendarDays,
    title: "Event Management",
    description:
      "Plan, publish, and coordinate events with a workflow that feels fast and polished.",
  },
  {
    icon: BadgeCheck,
    title: "Attendance",
    description:
      "Capture participation with precise records that stay organized for every chapter.",
  },
  {
    icon: Wallet,
    title: "Finance",
    description:
      "Keep budgets, payments, and reimbursements clear with simple financial oversight.",
  },
  {
    icon: Landmark,
    title: "Certificates",
    description:
      "Issue official certificates with a workflow that is consistent, secure, and easy to manage.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description:
      "See what is happening across your organization with metrics designed for action.",
  },
];

export function Features() {
  return (
    <section id="features" className="px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <div className="text-sm font-medium uppercase tracking-[0.34em] text-secondary-foreground">
            Features
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
            Everything your chapter needs in one place.
          </h2>
          <p className="mt-4 max-w-xl text-lg leading-8 text-secondary-foreground">
            ChapterHQ brings the operational tools of a serious SaaS platform to
            student organizations without the clutter.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article
                key={feature.title}
                className="group rounded-[1.5rem] border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(77,54,37,0.08)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-[#fcf8f1] text-[#5c4033] transition-colors duration-300 group-hover:bg-[#f3eadf]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-xl font-semibold tracking-[-0.02em] text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-secondary-foreground">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}