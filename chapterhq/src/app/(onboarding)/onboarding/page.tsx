import { redirect } from "next/navigation";

export default function OnboardingPage() {
  // The old combined signup+org form is replaced.
  // /signup handles account creation, /welcome handles org onboarding choice.
  redirect("/signup");
}
