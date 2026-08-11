import { WelcomeChoice } from "@/features/onboarding/components/welcome-choice";

export const metadata = {
  title: "Get started — ChapterHQ",
  description: "Create a new organization or join an existing one.",
};

export default function WelcomePage() {
  return (
    <section className="w-full max-w-2xl">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-secondary-foreground">
          ChapterHQ
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
          Welcome! How would you like to get started?
        </h1>
        <p className="mt-3 text-sm leading-6 text-secondary-foreground">
          You can create a new organization or join one you&apos;ve been invited to.
        </p>
      </div>

      <WelcomeChoice />
    </section>
  );
}
