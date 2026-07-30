import { CTA } from "@/components/landing/CTA";
import { DashboardPreview } from "@/components/landing/DashboardPreview";
import { Features } from "@/components/landing/Features";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { Navbar } from "@/components/landing/Navbar";
import { TrustedBy } from "@/components/landing/TrustedBy";
import { WhySection } from "@/components/landing/WhySection";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Hero />
      <TrustedBy />
      <Features />
      <DashboardPreview />
      <WhySection />
      <CTA />
      <Footer />
    </main>
  );
}
