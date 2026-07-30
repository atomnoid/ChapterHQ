const benefits = [
  {
    number: "01",
    title: "Modern UI",
    description:
      "A calm interface with strong hierarchy, refined spacing, and a product feel that signals quality immediately.",
  },
  {
    number: "02",
    title: "Fast & Secure",
    description:
      "Responsive workflows, clean permissions, and a structure built to support serious organizational operations.",
  },
  {
    number: "03",
    title: "Built to Scale",
    description:
      "Designed for more chapters, more members, and more activity without becoming difficult to manage.",
  },
];

export function WhySection() {
  return (
    <section id="about" className="px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <div className="text-sm font-medium uppercase tracking-[0.34em] text-secondary-foreground">
            Why ChapterHQ?
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
            Built for students.
          </h2>
          <p className="mt-4 text-lg leading-8 text-secondary-foreground">
            ChapterHQ balances polish and practicality so organizations can feel
            modern without sacrificing control.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {benefits.map((benefit) => (
            <article
              key={benefit.number}
              className="rounded-[1.75rem] border border-border bg-card p-6 shadow-sm"
            >
              <div className="inline-flex rounded-full border border-border bg-[#fcf8f1] px-3 py-1 text-xs font-semibold tracking-[0.3em] text-secondary-foreground">
                {benefit.number}
              </div>
              <h3 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-foreground">
                {benefit.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-secondary-foreground">
                {benefit.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}