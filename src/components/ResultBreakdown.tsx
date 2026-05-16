import { Progress } from "@/components/ui/progress";
import type { FinalReport } from "@/lib/types";

interface Props {
  breakdown: FinalReport["breakdown"];
}

const LABELS: Record<string, string> = {
  clarity: "Clarity",
  relevance: "Relevance",
  structure: "Structure",
  confidence: "Confidence",
  technicalAccuracy: "Technical Accuracy",
  communication: "Communication",
  resumeMatch: "Resume Match",
  companyReadiness: "Company Readiness",
  speechConfidence: "Speech Confidence",
  cameraPresence: "Camera Presence",
};

export function ResultBreakdown({ breakdown }: Props) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
      <h3 className="font-display text-xl font-semibold">Skill breakdown</h3>
      <div className="mt-6 space-y-5">
        {Object.entries(breakdown).map(([key, value = 0]) => (
          <div key={key}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{LABELS[key] ?? key}</span>
              <span className="text-muted-foreground">{value}%</span>
            </div>
            <Progress value={value} className="mt-2 h-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
