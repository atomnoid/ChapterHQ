const organizations = [
  "ORG 01",
  "ORG 02",
  "ORG 03",
  "ORG 04",
  "ORG 05",
  "ORG 06",
];

export function TrustedBy() {
  return (
    <section className="px-4 pb-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-[2rem] border border-border bg-card px-6 py-10 shadow-sm sm:px-8">
        <div className="text-center text-sm font-medium uppercase tracking-[0.34em] text-secondary-foreground">
          Trusted by
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {organizations.map((organization) => (
            <div
              key={organization}
              className="flex h-16 items-center justify-center rounded-full border border-border bg-[#fcf8f1] text-sm font-semibold tracking-[0.28em] text-[#7e6f61]"
            >
              {organization}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}