import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Briefcase,
  Building2,
  Camera,
  CheckCircle2,
  FileQuestion,
  Lightbulb,
  ListChecks,
  Mic,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";

import { RequireAuth } from "@/components/RequireAuth";
import { ResultBreakdown } from "@/components/ResultBreakdown";
import { ScoreCard } from "@/components/ScoreCard";
import { Button } from "@/components/ui/button";
import type { FinalReport, InterviewSetup } from "@/lib/types";

export const Route = createFileRoute("/result")({
  head: () => ({
    meta: [
      { title: "Your Result Report — InterviewReady AI" },
      {
        name: "description",
        content: "See your interview readiness score, skill breakdown, strengths, and next steps.",
      },
      { property: "og:title", content: "Interview Result Report" },
      {
        property: "og:description",
        content: "Your AI-graded interview report and next steps.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <ResultPage />
    </RequireAuth>
  ),
});

function ResultPage() {
  const [report, setReport] = useState<FinalReport | null>(null);
  const [setup, setSetup] = useState<InterviewSetup | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const rawReport = localStorage.getItem("ir.report");

    if (rawReport) {
      try {
        setReport(JSON.parse(rawReport));
      } catch {
        setReport(null);
      }
    }

    const rawSession = localStorage.getItem("ir.session");
    const rawSetup = localStorage.getItem("ir.setup");
    const rawSessionId = localStorage.getItem("ir.sessionId") || "";

    if (rawSession) {
      try {
        const parsedSession = JSON.parse(rawSession);

        if (parsedSession?.setup) {
          setSetup(parsedSession.setup);
        }

        if (parsedSession?.sessionId) {
          setSessionId(parsedSession.sessionId);
        } else if (rawSessionId) {
          setSessionId(rawSessionId);
        }
      } catch {
        if (rawSessionId) {
          setSessionId(rawSessionId);
        }
      }
    } else {
      if (rawSetup) {
        try {
          setSetup(JSON.parse(rawSetup));
        } catch {
          // noop
        }
      }

      if (rawSessionId) {
        setSessionId(rawSessionId);
      }
    }

    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center text-muted-foreground">
        Loading report…
      </div>
    );
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20">
        <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center shadow-elegant">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <FileQuestion className="h-7 w-7" />
          </span>

          <h1 className="mt-5 font-display text-2xl font-bold">No report yet</h1>

          <p className="mt-2 text-muted-foreground">
            Complete a practice interview to generate your readiness report with AI-graded feedback.
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="bg-primary-gradient text-primary-foreground shadow-elegant hover:opacity-90"
            >
              <Link to="/start">Start an interview</Link>
            </Button>

            <Button asChild size="lg" variant="outline">
              <Link to="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const visualMetrics = report.visualMetrics;
  const showVideoPresentationFeedback = Boolean(
    visualMetrics &&
    (String(setup?.mode || "").toLowerCase() === "video" ||
      typeof visualMetrics.overallPresentationScore === "number"),
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-border bg-hero-gradient p-8 text-center shadow-elegant sm:p-12">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Session complete
        </span>

        <h1 className="mt-4 font-display text-3xl font-bold sm:text-5xl">
          Your interview <span className="text-primary-gradient">readiness report</span>
        </h1>

        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
          A premium AI-graded breakdown of your performance, strengths, and next steps.
        </p>

        {sessionId && (
          <div className="mt-5">
            <Button asChild variant="outline" className="bg-card/80">
              <a href={`/session/${sessionId}`}>View Saved Session</a>
            </Button>
          </div>
        )}
      </div>

      {setup && (
        <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-elegant sm:p-8">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">Session summary</h2>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryItem icon={Briefcase} label="Job role" value={setup.role} />

            <SummaryItem icon={Target} label="Target role" value={setup.targetRole || setup.role} />

            <SummaryItem
              icon={Building2}
              label="Company"
              value={setup.targetCompany || "Not selected"}
            />

            <SummaryItem icon={ListChecks} label="Interview type" value={setup.type} />

            <SummaryItem icon={Target} label="Difficulty" value={setup.difficulty} />

            <SummaryItem icon={Activity} label="Mode" value={setup.mode} />

            <SummaryItem icon={BarChart3} label="Questions" value={String(setup.questionCount)} />
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        <ScoreCard score={report.overallScore} />
        <ResultBreakdown breakdown={report.breakdown} />
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-elegant sm:p-8">
        <h3 className="font-display text-xl font-semibold">Version 3 readiness signals</h3>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard
            icon={Target}
            label="Resume match"
            value={report.resumeMatchScore}
            fallback="Upload a resume"
          />
          <MetricCard
            icon={Building2}
            label="Company readiness"
            value={report.companyReadinessScore}
            fallback="Add company"
          />
          <MetricCard
            icon={Mic}
            label="Speech confidence"
            value={report.speechConfidenceScore}
            fallback="Use voice mode"
          />
          <MetricCard
            icon={Camera}
            label="Camera presence"
            value={report.cameraPresenceScore}
            fallback="Use video mode"
          />
          <MetricCard
            icon={Activity}
            label="Communication"
            value={report.communicationScore}
            fallback="Needs answers"
          />
        </div>

        {(report.speechMetrics || report.visualMetrics) && (
          <div className="mt-5 grid gap-4 text-sm text-muted-foreground md:grid-cols-2">
            {report.speechMetrics && (
              <div className="rounded-2xl border border-border bg-background p-4">
                <h4 className="font-semibold text-foreground">Speech metrics</h4>
                <p className="mt-2">
                  {report.speechMetrics.wordsPerMinute} wpm, {report.speechMetrics.fillerWordCount}{" "}
                  filler words, {report.speechMetrics.pauseCount} estimated long pauses.
                </p>
              </div>
            )}

            {report.visualMetrics && (
              <div className="rounded-2xl border border-border bg-background p-4">
                <h4 className="font-semibold text-foreground">Presentation metrics</h4>
                <p className="mt-2">
                  Camera active for {report.visualMetrics.cameraEnabledSeconds}s with{" "}
                  {report.visualMetrics.cameraPresenceScore}% presence score
                  {typeof report.visualMetrics.eyeContactScore === "number"
                    ? ` and ${report.visualMetrics.eyeContactScore}% eye-contact direction estimate.`
                    : "."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {showVideoPresentationFeedback && visualMetrics && (
        <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-elegant sm:p-8">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" />
            <h3 className="font-display text-xl font-semibold">Video Presentation Feedback</h3>
          </div>

          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            These metrics are based on camera-based presentation signals and are used only for
            interview practice feedback.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
            <PresentationMetricCard
              label="Overall"
              value={visualMetrics.overallPresentationScore}
            />
            <PresentationMetricCard
              label="Face visibility"
              value={visualMetrics.faceVisibilityScore}
            />
            <PresentationMetricCard
              label="Face centering"
              value={visualMetrics.faceCenteringScore}
            />
            <PresentationMetricCard
              label="Hand visibility"
              value={visualMetrics.handVisibilityScore}
            />
            <PresentationMetricCard
              label="Movement stability"
              value={visualMetrics.movementStabilityScore}
            />
            <PresentationMetricCard
              label="Eye-contact direction estimate"
              value={visualMetrics.eyeContactScore}
            />
            <PresentationMetricCard
              label="Camera presence"
              value={visualMetrics.cameraPresenceScore}
            />
          </div>

          {visualMetrics.visualSummary && visualMetrics.visualSummary.length > 0 && (
            <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
              {visualMetrics.visualSummary.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Panel icon={CheckCircle2} title="Strengths" items={report.strengths} tone="success" />

        <Panel
          icon={TrendingUp}
          title="Areas to improve"
          items={report.improvements}
          tone="warning"
        />
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-elegant sm:p-8">
        <h3 className="font-display text-xl font-semibold">Recommended next steps</h3>

        <ul className="mt-4 space-y-2 text-sm">
          {report.nextSteps.map((step) => (
            <li key={step} className="flex items-start gap-3">
              <span className="mt-0.5 grid h-5 w-5 place-items-center rounded-full bg-primary-gradient text-xs text-primary-foreground">
                →
              </span>
              {step}
            </li>
          ))}
        </ul>
      </div>

      {report.improvementPlan && report.improvementPlan.length > 0 && (
        <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-elegant sm:p-8">
          <h3 className="font-display text-xl font-semibold">Improvement plan</h3>

          <ul className="mt-4 space-y-2 text-sm">
            {report.improvementPlan.map((step, stepIndex) => (
              <li key={step} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-5 w-5 place-items-center rounded-full bg-accent text-xs text-accent-foreground">
                  {stepIndex + 1}
                </span>
                {step}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 rounded-3xl border border-border bg-accent/40 p-6 sm:p-8">
        <div className="flex items-center gap-2 text-sm font-semibold text-accent-foreground">
          <Lightbulb className="h-4 w-4" />
          Improved sample answer
        </div>

        <p className="mt-3 text-sm leading-relaxed">{report.improvedSampleAnswer}</p>
      </div>

      <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
        <Button
          asChild
          size="lg"
          className="w-full bg-primary-gradient text-primary-foreground shadow-elegant hover:opacity-90 sm:w-auto"
        >
          <Link to="/start">Practice Again</Link>
        </Button>

        {sessionId && (
          <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
            <a href={`/session/${sessionId}`}>View Saved Session</a>
          </Button>
        )}

        <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
          <Link to="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}

function SummaryItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Briefcase;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface-muted/50 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>

      <div className="mt-1.5 font-semibold">{value}</div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  fallback,
}: {
  icon: typeof Target;
  label: string;
  value?: number;
  fallback: string;
}) {
  const hasValue = typeof value === "number" && value > 0;

  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>

      <div className="mt-2 font-display text-2xl font-bold">
        {hasValue ? `${value}%` : fallback}
      </div>
    </div>
  );
}

function PresentationMetricCard({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-2xl font-bold">
        {typeof value === "number" ? `${value}%` : "Not captured"}
      </div>
    </div>
  );
}

function Panel({
  icon: Icon,
  title,
  items,
  tone,
}: {
  icon: typeof CheckCircle2;
  title: string;
  items: string[];
  tone: "success" | "warning";
}) {
  const toneClass =
    tone === "success" ? "text-success bg-success/5" : "text-warning-foreground bg-warning/15";

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-elegant sm:p-8">
      <div
        className={`inline-flex items-center gap-2 rounded-lg px-2.5 py-1 text-sm font-semibold ${toneClass}`}
      >
        <Icon className="h-4 w-4" />
        {title}
      </div>

      <ul className="mt-4 space-y-2 text-sm">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}
