import type {
  DashboardStats,
  FinalReport,
  InterviewType,
  JobRole,
  SessionSummary,
} from "@/lib/types";

type SupabaseTimestampLike =
  | string
  | {
      seconds?: number;
      toDate?: () => Date;
    };

interface SupabaseSession {
  id?: string;
  role?: string;
  targetRole?: string;
  targetCompany?: string;
  type?: string;
  interviewType?: string;
  difficulty?: string;
  mode?: string;
  status?: string;
  overallScore?: number | null;
  finalReport?: FinalReport | null;
  createdAt?: SupabaseTimestampLike;
  completedAt?: SupabaseTimestampLike | null;
}

function formatDate(value: SupabaseSession["createdAt"]) {
  if (!value) return "Unknown date";

  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleDateString();
  }

  if (typeof value.toDate === "function") {
    return value.toDate().toLocaleDateString();
  }

  if (typeof value.seconds === "number") {
    return new Date(value.seconds * 1000).toLocaleDateString();
  }

  return "Unknown date";
}

function getDateMs(value: SupabaseSession["createdAt"]) {
  if (!value) return 0;

  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  if (typeof value.toDate === "function") {
    return value.toDate().getTime();
  }

  if (typeof value.seconds === "number") {
    return value.seconds * 1000;
  }

  return 0;
}

export function mapSupabaseSessionToSummary(session: SupabaseSession): SessionSummary {
  return {
    id: session.id || crypto.randomUUID(),
    role: (session.role || "IT Support Intern") as JobRole,
    type: (session.type || session.interviewType || "Technical Interview") as InterviewType,
    date: formatDate(session.createdAt),
    score: Number(session.overallScore || session.finalReport?.overallScore || 0),
    status: session.status as SessionSummary["status"],
    targetCompany: session.targetCompany,
    targetRole: session.targetRole,
    difficulty: session.difficulty as SessionSummary["difficulty"],
    mode: session.mode as SessionSummary["mode"],
    overallPresentationScore: session.finalReport?.overallPresentationScore,
  };
}

export function buildDashboardStats(sessions: SupabaseSession[]): DashboardStats {
  const visibleSessions = sessions.filter((session) => session.status !== "cancelled");
  const sortedSessions = [...visibleSessions].sort(
    (a, b) => getDateMs(b.createdAt) - getDateMs(a.createdAt),
  );

  const completedSessions = sortedSessions.filter((session) => session.status === "completed");
  const latestCompletedSession = completedSessions[0];

  const totalSessions = visibleSessions.length;

  const averageScore =
    completedSessions.length > 0
      ? Math.round(
          completedSessions.reduce(
            (total, session) =>
              total + Number(session.overallScore || session.finalReport?.overallScore || 0),
            0,
          ) / completedSessions.length,
        )
      : 0;

  const recent = completedSessions
    .slice(0, 5)
    .map((session) => mapSupabaseSessionToSummary(session));

  const breakdownScores = completedSessions.flatMap((session) =>
    Object.entries(session.finalReport?.breakdown || {}).map(([key, value]) => ({
      key,
      value: Number(value || 0),
    })),
  );
  const scoreByKey = new Map<string, number[]>();

  breakdownScores.forEach((item) => {
    scoreByKey.set(item.key, [...(scoreByKey.get(item.key) || []), item.value]);
  });

  const averagedBreakdown = [...scoreByKey.entries()].map(([key, values]) => ({
    key,
    average: Math.round(values.reduce((total, value) => total + value, 0) / values.length),
  }));
  const bestSkill =
    averagedBreakdown.length > 0
      ? averagedBreakdown.reduce((best, item) => (item.average > best.average ? item : best)).key
      : "N/A";
  const weakestSkill =
    averagedBreakdown.length > 0
      ? averagedBreakdown.reduce((weakest, item) =>
          item.average < weakest.average ? item : weakest,
        ).key
      : "Start practicing";

  const averageReportScore = (key: keyof FinalReport) => {
    const values = completedSessions
      .map((session) => Number(session.finalReport?.[key] || 0))
      .filter((value) => value > 0);

    return values.length > 0
      ? Math.round(values.reduce((total, value) => total + value, 0) / values.length)
      : 0;
  };

  return {
    totalSessions,
    averageScore,
    latestScore: Number(
      latestCompletedSession?.overallScore ||
        latestCompletedSession?.finalReport?.overallScore ||
        0,
    ),
    bestSkill: formatBreakdownLabel(bestSkill),
    weakestSkill: formatBreakdownLabel(weakestSkill),
    resumeMatchScore: averageReportScore("resumeMatchScore"),
    companyReadinessScore: averageReportScore("companyReadinessScore"),
    speechConfidenceScore: averageReportScore("speechConfidenceScore"),
    cameraPresenceScore: averageReportScore("cameraPresenceScore"),
    overallPresentationScore: averageReportScore("overallPresentationScore"),
    recent,
  };
}

function formatBreakdownLabel(value: string) {
  const labels: Record<string, string> = {
    clarity: "Clarity",
    relevance: "Relevance",
    structure: "Structure",
    confidence: "Confidence",
    technicalAccuracy: "Technical accuracy",
    communication: "Communication",
    resumeMatch: "Resume match",
    companyReadiness: "Company readiness",
    speechConfidence: "Speech confidence",
    cameraPresence: "Camera presence",
    overallPresentation: "Presentation signals",
  };

  return labels[value] || value;
}
