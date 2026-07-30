export default async function DashboardPage() {
  return (
    <div className="space-y-6 pb-8">
      <section
        id="overview"
        className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-[0_20px_60px_rgba(77,54,37,0.08)]"
      >
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="relative p-6 sm:p-8 lg:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(176,137,104,0.12),_transparent_45%),radial-gradient(circle_at_bottom_left,_rgba(92,64,51,0.08),_transparent_42%)]" />
            <div className="relative">
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-secondary-foreground">
                ChapterHQ workspace
              </p>
              <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-4xl lg:text-5xl">
                Everything your chapter needs, organized in one place.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-secondary-foreground sm:text-base">
                Use this foundation to manage members, events, finances, and documents with a
                responsive dashboard shell that fits the ChapterHQ design system.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <div className="rounded-full border border-border bg-background px-4 py-2 text-sm text-secondary-foreground">
                  Active chapters: 12
                </div>
                <div className="rounded-full border border-border bg-background px-4 py-2 text-sm text-secondary-foreground">
                  Upcoming events: 4
                </div>
                <div className="rounded-full border border-border bg-background px-4 py-2 text-sm text-secondary-foreground">
                  Pending approvals: 7
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-border bg-[#fcf8f1] p-6 sm:p-8 lg:border-l lg:border-t-0">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {[
                { label: "Members", value: "248", note: "+18 this month" },
                { label: "Budget", value: "$18,420", note: "63% allocated" },
                { label: "Events", value: "9", note: "2 this week" },
                { label: "Documents", value: "31", note: "8 updated recently" },
              ].map((item) => (
                <article key={item.label} className="rounded-3xl border border-border bg-card p-5 shadow-[0_12px_30px_rgba(77,54,37,0.05)]">
                  <p className="text-xs font-medium uppercase tracking-[0.24em] text-secondary-foreground">
                    {item.label}
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-foreground">
                    {item.value}
                  </p>
                  <p className="mt-2 text-sm text-secondary-foreground">{item.note}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="activity" className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <article className="rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(77,54,37,0.06)] sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-secondary-foreground">
                Activity stream
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground">
                Latest chapter updates
              </h3>
            </div>
            <span className="rounded-full border border-border bg-[#fcf8f1] px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-secondary-foreground">
              Live
            </span>
          </div>

          <div className="mt-6 space-y-4">
            {[
              {
                title: "Membership approvals are up to date",
                body: "Three new applicants were reviewed and moved into onboarding this morning.",
              },
              {
                title: "Finance report synced",
                body: "The latest budget snapshot is ready for committee review and export.",
              },
              {
                title: "Upcoming event planning started",
                body: "Event logistics and volunteer assignments are now tracked in the workspace.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-3xl border border-border bg-[#fcf8f1] p-5">
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-secondary-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </article>

        <div className="space-y-6">
          <article id="members" className="rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(77,54,37,0.06)] sm:p-8">
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-secondary-foreground">
              Members
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground">
              Recent onboarding
            </h3>

            <div className="mt-6 space-y-4">
              {[
                ["Alyssa Johnson", "Treasurer"],
                ["Marco Reyes", "Member-at-large"],
                ["Nina Patel", "Event coordinator"],
              ].map(([name, role]) => (
                <div key={name} className="flex items-center gap-4 rounded-3xl border border-border bg-[#fcf8f1] p-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {name
                      .split(" ")
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{name}</p>
                    <p className="mt-1 text-sm text-secondary-foreground">{role}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article id="finance" className="rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(77,54,37,0.06)] sm:p-8">
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-secondary-foreground">
              Finance
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground">
              Budget snapshot
            </h3>
            <div className="mt-6 space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm text-secondary-foreground">
                  <span>Events</span>
                  <span>$7,800</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-secondary">
                  <div className="h-2 w-[68%] rounded-full bg-primary" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm text-secondary-foreground">
                  <span>Operations</span>
                  <span>$5,250</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-secondary">
                  <div className="h-2 w-[46%] rounded-full bg-primary" />
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section id="documents" className="rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(77,54,37,0.06)] sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-secondary-foreground">
              Documents
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground">
              Shared workspace files
            </h3>
          </div>
          <div className="rounded-full border border-border bg-[#fcf8f1] px-4 py-2 text-sm text-secondary-foreground">
            Foundation ready for uploads and permissions
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            "Meeting minutes",
            "Budget approvals",
            "Event checklist",
            "Policy handbook",
          ].map((label) => (
            <div key={label} className="rounded-3xl border border-border bg-[#fcf8f1] p-5">
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="mt-2 text-sm leading-6 text-secondary-foreground">
                Placeholder workspace card for future document workflows.
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}