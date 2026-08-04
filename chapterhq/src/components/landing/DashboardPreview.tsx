export function DashboardPreview() {
  return (
    <section id="dashboard-preview" className="px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-4xl text-center">
          <div className="text-sm font-medium uppercase tracking-[0.34em] text-secondary-foreground">
            Product preview
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
            Built to feel like a real SaaS workspace.
          </h2>
          <p className="mt-4 text-lg leading-8 text-secondary-foreground">
            Clean hierarchy, clear metrics, and a calm interface that makes the
            product feel instantly trustworthy.
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-[2rem] border border-border bg-card shadow-[0_30px_80px_rgba(77,54,37,0.12)]">
          <div className="flex items-center gap-2 border-b border-border px-4 py-4 sm:px-6">
            <span className="h-3 w-3 rounded-full bg-[#d1c2b2]" />
            <span className="h-3 w-3 rounded-full bg-[#bfa78b]" />
            <span className="h-3 w-3 rounded-full bg-[#8a6f5a]" />
            <div className="ml-auto rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-secondary-foreground">
              chapterhq.app/dashboard
            </div>
          </div>

          <div className="grid gap-4 p-4 sm:p-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[1.75rem] border border-border bg-[#fcf8f1] p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-foreground">
                    Overview
                  </div>
                  <div className="mt-1 text-sm text-secondary-foreground">
                    A clean command center for your organization
                  </div>
                </div>
                <div className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-secondary-foreground">
                  Live
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {[
                  ["Members", "1,248", "+12 this week"],
                  ["Attendance", "96%", "+2.1%"],
                  ["Finance", "₹24.8k", "+₹3.4k"],
                ].map(([label, value, delta]) => (
                  <div
                    key={label}
                    className="rounded-[1.5rem] border border-border bg-card p-4 shadow-sm"
                  >
                    <div className="text-xs uppercase tracking-[0.22em] text-secondary-foreground">
                      {label}
                    </div>
                    <div className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">
                      {value}
                    </div>
                    <div className="mt-2 text-sm text-secondary-foreground">
                      {delta}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-[1.5rem] border border-border bg-card p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-foreground">
                    Weekly engagement
                  </div>
                  <div className="text-sm text-secondary-foreground">
                    Last 7 days
                  </div>
                </div>

                <div className="mt-5 flex h-52 items-end gap-3 sm:h-64">
                  {["40%", "62%", "48%", "78%", "66%", "88%", "72%"].map(
                    (height, index) => (
                      <div key={height} className="flex-1">
                        <div className="flex h-full items-end rounded-3xl bg-[#f3eadf] p-2">
                          <div
                            className="w-full rounded-3xl bg-[#b08968] transition-transform duration-300 hover:-translate-y-0.5"
                            style={{ height }}
                          />
                        </div>
                        <div className="mt-2 text-center text-xs text-secondary-foreground">
                          {['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[1.75rem] border border-border bg-[#fcf8f1] p-4 sm:p-5">
                <div className="text-sm font-medium text-foreground">
                  Member activity
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    ["Avery Johnson", "Treasurer", "Approved"],
                    ["Mina Patel", "Events Chair", "Pending"],
                    ["Noah Kim", "Member", "Active"],
                  ].map(([name, role, status]) => (
                    <div
                      key={name}
                      className="flex items-center gap-4 rounded-[1.25rem] border border-border bg-card px-4 py-3"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f3eadf] text-sm font-semibold text-[#5c4033]">
                        {name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-foreground">
                          {name}
                        </div>
                        <div className="text-sm text-secondary-foreground">
                          {role}
                        </div>
                      </div>
                      <div className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-secondary-foreground">
                        {status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-border bg-[#fcf8f1] p-4 sm:p-5">
                <div className="text-sm font-medium text-foreground">
                  Quick actions
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    "Create event",
                    "Export report",
                    "Issue certificate",
                    "Review payments",
                  ].map((action) => (
                    <div
                      key={action}
                      className="rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground"
                    >
                      {action}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
