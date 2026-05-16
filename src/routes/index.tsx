import { createFileRoute } from "@tanstack/react-router";
import { Brain, MessageSquare, Sparkles, TrendingUp } from "lucide-react";
import { FeatureCard } from "@/components/FeatureCard";
import { FinalCta } from "@/components/FinalCta";
import { HeroSection } from "@/components/HeroSection";
import { HowItWorks } from "@/components/HowItWorks";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InterviewReady AI — Practice Smarter. Interview Better." },
      {
        name: "description",
        content:
          "Prepare for job interviews with AI-generated questions, instant feedback, and progress tracking — built for students and fresh graduates.",
      },
      { property: "og:title", content: "InterviewReady AI" },
      { property: "og:description", content: "Practice job interviews with AI feedback." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div>
      <HeroSection />
      <section className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Everything you need to feel ready</h2>
            <p className="mt-3 text-muted-foreground">
              Built for students preparing for their first real interviews.
            </p>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={Brain}
              title="AI Interview Simulation"
              description="Realistic interview flow that adapts to your role and experience."
            />
            <FeatureCard
              icon={MessageSquare}
              title="Instant Answer Feedback"
              description="Score and structured tips on every answer in seconds."
            />
            <FeatureCard
              icon={Sparkles}
              title="Role-Based Questions"
              description="Curated questions for IT, software, networking, security and more."
            />
            <FeatureCard
              icon={TrendingUp}
              title="Progress Tracking"
              description="Watch your readiness score improve session over session."
            />
          </div>
        </div>
      </section>
      <HowItWorks />
      <FinalCta />
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} InterviewReady AI. Built for students.
      </footer>
    </div>
  );
}
