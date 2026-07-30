import Link from "next/link";

const columns = [
  {
    title: "Product",
    links: ["Features", "Pricing", "Dashboard", "Security"],
  },
  {
    title: "Company",
    links: ["About", "Careers", "Contact", "Press"],
  },
  {
    title: "Resources",
    links: ["Docs", "Guides", "Support", "Status"],
  },
  {
    title: "Legal",
    links: ["Privacy", "Terms", "Cookies", "License"],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border/80 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <Link href="#top" className="inline-flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-sm font-semibold tracking-[0.24em] text-foreground">
              C
            </span>
            <span className="text-sm font-semibold tracking-[0.22em] text-foreground uppercase">
              ChapterHQ
            </span>
          </Link>

          <p className="mt-5 max-w-md text-sm leading-7 text-secondary-foreground">
            Premium software for student organizations that need structure,
            clarity, and a product experience that feels built for scale.
          </p>

          <p className="mt-8 text-sm text-secondary-foreground">
            © 2026 ChapterHQ
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
          {columns.map((column) => (
            <div key={column.title}>
              <div className="text-sm font-semibold text-foreground">
                {column.title}
              </div>
              <ul className="mt-4 space-y-3 text-sm text-secondary-foreground">
                {column.links.map((link) => (
                  <li key={link}>
                    <Link
                      href="#"
                      className="transition-colors hover:text-foreground"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}