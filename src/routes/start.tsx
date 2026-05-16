import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText, Sparkles } from "lucide-react";

import { InterviewSetupForm } from "@/components/InterviewSetupForm";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/start")({
  head: () => ({
    meta: [
      { title: "Start Interview — InterviewReady AI" },
      {
        name: "description",
        content:
          "Set up your interview practice: choose role, target company, type, difficulty, mode, and number of questions.",
      },
      { property: "og:title", content: "Start a new interview practice" },
      {
        property: "og:description",
        content: "Choose your role, interview type, difficulty, mode, and target company to begin.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <StartPage />
    </RequireAuth>
  ),
});

function StartPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Button asChild variant="ghost" className="mb-4">
          <Link to="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to dashboard
          </Link>
        </Button>

        <div className="rounded-3xl border border-border bg-hero-gradient p-8 text-center shadow-elegant sm:p-12">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Personalized interview setup
          </span>

          <h1 className="mt-4 font-display text-3xl font-bold sm:text-5xl">
            Set up your <span className="text-primary-gradient">practice session</span>
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Choose your target role, company, interview type, difficulty, and practice mode before
            entering the interview room.
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild variant="outline" className="bg-card/80">
              <Link to="/resume">
                <FileText className="mr-2 h-4 w-4" />
                Manage Resume
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 shadow-elegant sm:p-8">
        <InterviewSetupForm />
      </div>
    </div>
  );
}
