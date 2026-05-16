import { CheckCircle2, Lightbulb, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { Feedback } from "@/lib/types";

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{value}/10</span>
      </div>
      <Progress value={value * 10} className="mt-1.5 h-2" />
    </div>
  );
}

export function FeedbackCard({ feedback }: { feedback: Feedback }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-elegant sm:p-8">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary-gradient text-primary-foreground">
          <span className="font-display text-lg font-bold">{feedback.overall}</span>
        </div>
        <div>
          <h3 className="font-display text-xl font-semibold">AI Feedback</h3>
          <p className="text-sm text-muted-foreground">Overall score: {feedback.overall}/10</p>
        </div>
      </div>

      <p className="mt-5 rounded-xl bg-surface-muted p-4 text-sm leading-relaxed">
        {feedback.summary}
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <ScoreRow label="Clarity" value={feedback.clarity} />
        <ScoreRow label="Relevance" value={feedback.relevance} />
        <ScoreRow label="Structure" value={feedback.structure} />
        <ScoreRow label="Technical Accuracy" value={feedback.technicalAccuracy} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-success/5 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-success">
            <CheckCircle2 className="h-4 w-4" /> Strengths
          </div>
          <ul className="mt-2 space-y-1.5 text-sm text-foreground">
            {feedback.strengths.map((s) => (
              <li key={s}>• {s}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-destructive/5 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <XCircle className="h-4 w-4" /> Areas to improve
          </div>
          <ul className="mt-2 space-y-1.5 text-sm text-foreground">
            {feedback.weaknesses.map((s) => (
              <li key={s}>• {s}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-accent/40 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-accent-foreground">
          <Lightbulb className="h-4 w-4" /> Improved answer example
        </div>
        <p className="mt-2 text-sm leading-relaxed">{feedback.improvedAnswer}</p>
      </div>

      <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Lightbulb className="h-4 w-4" /> Interview tip
        </div>
        <p className="mt-2 text-sm leading-relaxed text-foreground">{feedback.interviewTip}</p>
      </div>
    </div>
  );
}
