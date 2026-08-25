import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Event Registration — ChapterHQ",
  description: "Register for the event and get your unique QR check-in code.",
};

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background">
      {children}
    </main>
  );
}
