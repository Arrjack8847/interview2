import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowLeft,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  FileText,
  MessageSquare,
  Mic,
  Target,
} from "lucide-react";
import { useEffect, useState } from "react";

import { RequireAuth } from "@/components/RequireAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { getInterviewSession, getSessionAnswers } from "@/lib/supabaseService";
import type { FinalReport } from "@/lib/types";

export const Route = createFileRoute("/session/$sessionId")({
  head: () => ({
    meta: [
      { title: "Session Details — InterviewReady AI" },
      {
        name: "description",
        content: "Review saved interview questions, answers, and AI feedback.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <SessionDetailPage />
    </RequireAuth>
  ),
});

type SupabaseTimestampLike =
  | string
  | {
      seconds?: number;
      toDate?: () => Date;
    };

interface SavedSession {
  id: string;
  userId?: string;
  role?: string;
  type?: string;
  interviewType?: string;
  difficulty?: string;
  status?: string;
  overallScore?: number | null;
  finalReport?: FinalReport | null;
  targetCompany?: string;
  targetRole?: string;
  mode?: string;
  questionCount?: number;
  createdAt?: SupabaseTimestampLike;
  completedAt?: SupabaseTimestampLike | null;
}

interface SavedAnswer {
  id: string;
  questionId?: number;
  questionText?: string;
  answerText?: string;
  feedback?: {
    overall?: number;
    clarity?: number;
    relevance?: number;
    structure?: number;
    technicalAccuracy?: number;
    strengths?: string[];
    weaknesses?: string[];
    improvedAnswer?: string;
    summary?: string;
    interviewTip?: string;
  };
  scores?: {
    overall?: number;
    clarity?: number;
    relevance?: number;
    structure?: number;
    technicalAccuracy?: number;
  };
  strengths?: string[];
  weaknesses?: string[];
  improvedAnswer?: string;
  summary?: string;
  interviewTip?: string;
  createdAt?: SupabaseTimestampLike;
}

function formatDate(value?: SupabaseTimestampLike | null) {
  if (!value) return "Not available";

  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleString();
  }

  if (typeof value.toDate === "function") {
    return value.toDate().toLocaleString();
  }

  if (typeof value.seconds === "number") {
    return new Date(value.seconds * 1000).toLocaleString();
  }

  return "Not available";
}

function getScore(answer: SavedAnswer, key: keyof NonNullable<SavedAnswer["scores"]>) {
  return answer.scores?.[key] ?? answer.feedback?.[key] ?? 0;
}

function getStrengths(answer: SavedAnswer) {
  return answer.strengths || answer.feedback?.strengths || [];
}

function getWeaknesses(answer: SavedAnswer) {
  return answer.weaknesses || answer.feedback?.weaknesses || [];
}

function getImprovedAnswer(answer: SavedAnswer) {
  return answer.improvedAnswer || answer.feedback?.improvedAnswer || "";
}

function getInterviewTip(answer: SavedAnswer) {
  return answer.interviewTip || answer.feedback?.interviewTip || answer.summary || "";
}

function SessionDetailPage() {
  const { sessionId } = Route.useParams();
  const { user } = useAuth();

  const [session, setSession] = useState<SavedSession | null>(null);
  const [answers, setAnswers] = useState<SavedAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;

    const loadSessionDetails = async () => {
      try {
        setLoading(true);
        setError("");

        const [sessionData, answerData] = await Promise.all([
          getInterviewSession(sessionId),
          getSessionAnswers({
            sessionId,
            userId: user.uid,
          }),
        ]);

        if (!sessionData) {
          setError("This interview session could not be found.");
          return;
        }

        setSession(sessionData as SavedSession);

        const mappedAnswers = answerData as SavedAnswer[];

        mappedAnswers.sort((a, b) => {
          const aId = Number(a.questionId || 0);
          const bId = Number(b.questionId || 0);
          return aId - bId;
        });

        setAnswers(mappedAnswers);
      } catch (error) {
        console.error("Failed to load session details:", error);
        setError("Could not load this saved interview session.");
      } finally {
        setLoading(false);
      }
    };

    loadSessionDetails();
  }, [sessionId, user]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <p className="text-muted-foreground">Loading saved session...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Session not found</h1>
        <p className="mt-2 text-muted-foreground">
          {error || "This saved interview session could not be loaded."}
        </p>

        <Button asChild className="mt-6">
          <Link to="/history">Back to history</Link>
        </Button>
      </div>
    );
  }

  const sessionType = session.type || session.interviewType || "Interview";
  const sessionStatus = session.status || "unknown";
  const finalReport = session.finalReport;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Button asChild variant="ghost" className="mb-4">
          <Link to="/history">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to history
          </Link>
        </Button>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-elegant">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{session.role || "Interview"}</Badge>
                <Badge variant="outline">{sessionType}</Badge>
                <Badge variant="outline">{session.difficulty || "Difficulty"}</Badge>
                <Badge
                  variant="outline"
                  className={
                    sessionStatus === "completed"
                      ? "border-success/30 bg-success/10 text-success"
                      : "border-warning/40 bg-warning/10 text-warning-foreground"
                  }
                >
                  {sessionStatus}
                </Badge>
              </div>

              <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
                Saved Interview Session
              </h1>

              <p className="mt-2 max-w-2xl text-muted-foreground">
                Review your saved answers, AI feedback, scores, strengths, and improvement points.
              </p>
            </div>

            <div className="rounded-2xl bg-accent/50 p-4 text-center">
              <p className="text-xs text-muted-foreground">Overall Score</p>
              <p className="font-display text-3xl font-bold text-primary">
                {typeof session.overallScore === "number" ? `${session.overallScore}%` : "--"}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-2 rounded-xl bg-background p-3">
              <Calendar className="h-4 w-4 text-primary" />
              <span>{formatDate(session.createdAt)}</span>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-background p-3">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>Completed: {formatDate(session.completedAt)}</span>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-background p-3">
              <Target className="h-4 w-4 text-primary" />
              <span>{session.questionCount || answers.length} questions</span>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-background p-3">
              <FileText className="h-4 w-4 text-primary" />
              <span>
                {session.targetCompany ? `Target: ${session.targetCompany}` : "No target company"}
              </span>
            </div>
          </div>

          {finalReport && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <ReportSignal
                icon={Target}
                label="Resume match"
                value={finalReport.resumeMatchScore}
              />
              <ReportSignal
                icon={Building2}
                label="Company readiness"
                value={finalReport.companyReadinessScore}
              />
              <ReportSignal
                icon={Mic}
                label="Speech confidence"
                value={finalReport.speechConfidenceScore}
              />
              <ReportSignal
                icon={Camera}
                label="Camera presence"
                value={finalReport.cameraPresenceScore}
              />
              <ReportSignal
                icon={Activity}
                label="Communication"
                value={finalReport.communicationScore}
              />
            </div>
          )}

          {finalReport?.visualMetrics &&
            (String(session.mode || "").toLowerCase() === "video" ||
              typeof finalReport.visualMetrics.overallPresentationScore === "number") && (
              <div className="mt-6 rounded-2xl border border-border bg-background p-5">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold">Video Presentation Feedback</h2>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
                  <PresentationSignal
                    label="Overall"
                    value={finalReport.visualMetrics.overallPresentationScore}
                  />
                  <PresentationSignal
                    label="Face visibility"
                    value={finalReport.visualMetrics.faceVisibilityScore}
                  />
                  <PresentationSignal
                    label="Face centering"
                    value={finalReport.visualMetrics.faceCenteringScore}
                  />
                  <PresentationSignal
                    label="Hand visibility"
                    value={finalReport.visualMetrics.handVisibilityScore}
                  />
                  <PresentationSignal
                    label="Movement stability"
                    value={finalReport.visualMetrics.movementStabilityScore}
                  />
                  <PresentationSignal
                    label="Eye-contact direction estimate"
                    value={finalReport.visualMetrics.eyeContactScore}
                  />
                  <PresentationSignal
                    label="Camera presence"
                    value={finalReport.visualMetrics.cameraPresenceScore}
                  />
                </div>

                {finalReport.visualMetrics.visualSummary?.length ? (
                  <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
                    {finalReport.visualMetrics.visualSummary.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
        </div>
      </div>

      {finalReport?.improvementPlan && finalReport.improvementPlan.length > 0 && (
        <div className="mb-6 rounded-3xl border border-border bg-card p-6 shadow-elegant">
          <h2 className="font-display text-xl font-semibold">Improvement plan</h2>

          <ul className="mt-4 space-y-2 text-sm">
            {finalReport.improvementPlan.map((step) => (
              <li key={step}>- {step}</li>
            ))}
          </ul>
        </div>
      )}

      {answers.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-muted-foreground">No answers were saved for this session yet.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {answers.map((savedAnswer, answerIndex) => (
            <div
              key={savedAnswer.id}
              className="rounded-3xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-gradient text-sm font-bold text-primary-foreground">
                    {answerIndex + 1}
                  </span>

                  <h2 className="font-display text-xl font-semibold">Question {answerIndex + 1}</h2>
                </div>

                <Badge variant="secondary">Overall {getScore(savedAnswer, "overall")}/10</Badge>
              </div>

              <div className="mt-5 space-y-4">
                <div className="rounded-2xl bg-accent/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Question
                  </p>
                  <p className="mt-2 text-sm font-medium">
                    {savedAnswer.questionText || "No question text saved."}
                  </p>
                </div>

                <div className="rounded-2xl border border-border p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Your answer
                  </p>
                  <p className="mt-2 text-sm text-foreground">
                    {savedAnswer.answerText || "No answer saved."}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {[
                    ["Clarity", getScore(savedAnswer, "clarity")],
                    ["Relevance", getScore(savedAnswer, "relevance")],
                    ["Structure", getScore(savedAnswer, "structure")],
                    ["Technical", getScore(savedAnswer, "technicalAccuracy")],
                    ["Overall", getScore(savedAnswer, "overall")],
                  ].map(([label, score]) => (
                    <div
                      key={String(label)}
                      className="rounded-2xl border border-border bg-background p-4 text-center"
                    >
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="mt-1 font-display text-2xl font-bold">{String(score)}/10</p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-success/20 bg-success/5 p-4">
                    <h3 className="font-semibold text-success">Strengths</h3>
                    <ul className="mt-3 space-y-2 text-sm">
                      {getStrengths(savedAnswer).length > 0 ? (
                        getStrengths(savedAnswer).map((item) => <li key={item}>• {item}</li>)
                      ) : (
                        <li className="text-muted-foreground">No strengths saved.</li>
                      )}
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4">
                    <h3 className="font-semibold text-warning-foreground">Improvements</h3>
                    <ul className="mt-3 space-y-2 text-sm">
                      {getWeaknesses(savedAnswer).length > 0 ? (
                        getWeaknesses(savedAnswer).map((item) => <li key={item}>• {item}</li>)
                      ) : (
                        <li className="text-muted-foreground">No improvements saved.</li>
                      )}
                    </ul>
                  </div>
                </div>

                {getImprovedAnswer(savedAnswer) && (
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                    <h3 className="font-semibold">Improved answer</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {getImprovedAnswer(savedAnswer)}
                    </p>
                  </div>
                )}

                {getInterviewTip(savedAnswer) && (
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex items-center gap-2 font-semibold">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      Interview tip
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {getInterviewTip(savedAnswer)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportSignal({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Target;
  label: string;
  value?: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 font-display text-2xl font-bold">{value ? `${value}%` : "--"}</p>
    </div>
  );
}

function PresentationSignal({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-bold">
        {typeof value === "number" ? `${value}%` : "--"}
      </p>
    </div>
  );
}
