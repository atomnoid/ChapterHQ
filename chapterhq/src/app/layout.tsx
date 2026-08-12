import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    default: "ChapterHQ - Organization Operating System",
    template: "%s | ChapterHQ",
  },
  description: "ChapterHQ is the modern operating system for managing members, committees, events, documents, finances, and organization governance.",
  keywords: ["chapterhq", "organization management", "committee management", "event tracking", "member management"],
  authors: [{ name: "ChapterHQ Team" }],
  viewport: "width=device-width, initial-scale=1",
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
