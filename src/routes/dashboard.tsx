import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Award, BarChart3, Building2, Camera, Mic, Plus, Target, TrendingDown } from "lucide-react";
import { useEffect, useState } from "react";

import { DashboardCard } from "@/components/DashboardCard";
import { RequireAuth } from "@/components/RequireAuth";
import { SessionHistoryCard } from "@/components/SessionHistoryCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { getUserInterviewSessions } from "@/lib/supabaseService";
import { buildDashboardStats, mapSupabaseSessionToSummary } from "@/lib/sessionUtils";
import type { DashboardStats, SessionSummary } from "@/lib/types";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — InterviewReady AI" },
      {
        name: "description",
        content: "Track your interview practice progress, scores, and recent sessions.",
      },
      { property: "og:title", content: "Dashboard — InterviewReady AI" },
      {
        property: "og:description",
        content: "Your interview practice progress at a glance.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  ),
});

const EMPTY_STATS: DashboardStats = {
  totalSessions: 0,
  averageScore: 0,
  latestScore: 0,
  bestSkill: "N/A",
  weakestSkill: "Start practicing",
  resumeMatchScore: 0,
  companyReadinessScore: 0,
  speechConfidenceScore: 0,
  cameraPresenceScore: 0,
  overallPresentationScore: 0,
  recent: [],
};

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [activeSessions, setActiveSessions] = useState<SessionSummary[]>([]);
  const [completedSessions, setCompletedSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Student";

  useEffect(() => {
    if (!user) return;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const sessions = await getUserInterviewSessions(user.uid);
        const visibleSessions = sessions.filter((session) => session.status !== "cancelled");
        const dashboardStats = buildDashboardStats(visibleSessions);

        setStats(dashboardStats);
        setActiveSessions(
          visibleSessions
            .filter((session) => session.status === "in-progress")
            .map((session) => mapSupabaseSessionToSummary(session)),
        );
        setCompletedSessions(
          visibleSessions
            .filter((session) => session.status === "completed")
            .map((session) => mapSupabaseSessionToSummary(session)),
        );
      } catch (error) {
        console.error("Failed to load dashboard sessions:", error);
        setError("Could not load your dashboard data from Supabase.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [user]);

  const handleContinueSession = (session: SessionSummary) => {
    localStorage.setItem("ir.sessionId", session.id);
    localStorage.removeItem("ir.session");
    localStorage.removeItem("ir.report");
    navigate({ to: "/interview" });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">
            Welcome back, <span className="text-primary-gradient">{displayName}</span>
          </h1>

          <p className="mt-1 text-muted-foreground">
            Track your interview practice progress and improve your readiness.
          </p>
        </div>

        <Button
          asChild
          size="lg"
          className="w-full bg-primary-gradient text-primary-foreground shadow-elegant hover:opacity-90 sm:w-auto"
        >
          <Link to="/start">
            <Plus className="mr-2 h-4 w-4" />
            Start New Interview
          </Link>
        </Button>
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          label="Total Sessions"
          value={loading ? "..." : stats.totalSessions}
          icon={BarChart3}
          hint="Saved in Supabase"
        />

        <DashboardCard
          label="Average Score"
          value={loading ? "..." : `${stats.averageScore}%`}
          icon={Target}
          tone="success"
          hint="Completed sessions"
        />

        <DashboardCard
          label="Latest Score"
          value={loading ? "..." : `${stats.latestScore}%`}
          icon={Award}
          tone="success"
          hint="Most recent completed session"
        />

        <DashboardCard
          label="Needs Improvement"
          value={loading ? "..." : stats.weakestSkill}
          icon={TrendingDown}
          tone="warning"
          hint="Focus area"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          label="Resume Match"
          value={loading ? "..." : `${stats.resumeMatchScore}%`}
          icon={Target}
          hint="Average from final reports"
        />

        <DashboardCard
          label="Company Readiness"
          value={loading ? "..." : `${stats.companyReadinessScore}%`}
          icon={Building2}
          hint="Target company alignment"
        />

        <DashboardCard
          label="Speech Confidence"
          value={loading ? "..." : `${stats.speechConfidenceScore}%`}
          icon={Mic}
          tone="success"
          hint="Voice and pace signals"
        />

        <DashboardCard
          label="Camera Presence"
          value={loading ? "..." : `${stats.cameraPresenceScore}%`}
          icon={Camera}
          tone="warning"
          hint="Video mode presence"
        />
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Active Practice</h2>

          <Link to="/start" className="text-sm font-medium text-primary hover:underline">
            Start new
          </Link>
        </div>

        {loading ? (
          <div className="mt-4 rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Loading active sessions...
          </div>
        ) : activeSessions.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-dashed border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">No unfinished sessions right now.</p>

            <Button asChild className="mt-4">
              <Link to="/start">Start New Interview</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {activeSessions.map((session) => (
              <div
                key={session.id}
                className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 shadow-elegant sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h3 className="font-semibold">{session.targetRole || session.role}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {session.type} - {session.difficulty || "Practice"} - {session.date}
                  </p>
                </div>

                <Button type="button" onClick={() => handleContinueSession(session)}>
                  Continue Interview
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Completed Sessions</h2>

          <Link to="/history" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </div>

        {loading ? (
          <div className="mt-4 rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Loading completed sessions...
          </div>
        ) : completedSessions.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-dashed border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              Completed sessions will appear here after you finish an interview.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {completedSessions.slice(0, 5).map((session) => (
              <SessionHistoryCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
