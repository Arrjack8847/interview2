import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { RequireAuth } from "@/components/RequireAuth";
import { SessionHistoryCard } from "@/components/SessionHistoryCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { getUserInterviewSessions } from "@/lib/supabaseService";
import { mapSupabaseSessionToSummary } from "@/lib/sessionUtils";
import type { SessionSummary } from "@/lib/types";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Practice History — InterviewReady AI" },
      {
        name: "description",
        content: "Browse your past interview practice sessions, scores, and reports.",
      },
      { property: "og:title", content: "Practice History" },
      {
        property: "og:description",
        content: "Review every interview practice session.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <HistoryPage />
    </RequireAuth>
  ),
});

function HistoryPage() {
  const { user } = useAuth();

  const [history, setHistory] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;

    const loadHistory = async () => {
      try {
        setLoading(true);
        setError("");

        const sessions = await getUserInterviewSessions(user.uid);

        const mappedHistory = sessions
          .filter((session) => session.status === "completed")
          .map((session) => mapSupabaseSessionToSummary(session));

        setHistory(mappedHistory);
      } catch (error) {
        console.error("Failed to load history:", error);
        setError("Could not load your practice history from Supabase.");
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [user]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Practice history</h1>

          <p className="mt-1 text-muted-foreground">
            All your saved interview sessions from Supabase.
          </p>
        </div>

        <Button
          asChild
          className="bg-primary-gradient text-primary-foreground shadow-elegant hover:opacity-90"
        >
          <Link to="/start">
            <Plus className="mr-2 h-4 w-4" />
            New session
          </Link>
        </Button>
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-8 rounded-3xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">Loading your saved sessions...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="mt-12 rounded-3xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            No sessions yet. Start your first practice to see it here.
          </p>

          <Button asChild className="mt-4">
            <Link to="/start">Start your first interview</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {history.map((session) => (
            <SessionHistoryCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}
