import { ArrowUpRight, Briefcase, Building2, Calendar } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { SessionSummary } from "@/lib/types";

function scoreTier(score: number) {
  if (score >= 80) {
    return {
      label: "High",
      badgeClass: "bg-success/15 text-success border-success/30",
      barClass: "bg-success",
      numberClass: "text-success",
    };
  }

  if (score >= 60) {
    return {
      label: "Medium",
      badgeClass: "bg-warning/20 text-warning-foreground border-warning/40",
      barClass: "bg-warning",
      numberClass: "text-warning-foreground",
    };
  }

  return {
    label: score > 0 ? "Low" : "In progress",
    badgeClass:
      score > 0
        ? "bg-destructive/15 text-destructive border-destructive/30"
        : "bg-muted text-muted-foreground border-border",
    barClass: score > 0 ? "bg-destructive" : "bg-muted-foreground/40",
    numberClass: score > 0 ? "text-destructive" : "text-muted-foreground",
  };
}

function formatSessionDate(date: string) {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return date || "Unknown date";
  }

  return parsedDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function SessionHistoryCard({ session }: { session: SessionSummary }) {
  const tier = scoreTier(session.score);
  const detailHref = `/session/${session.id}`;

  return (
    <div className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-elegant sm:flex-row sm:items-center sm:justify-between">
      <span className={`absolute inset-y-0 left-0 w-1 ${tier.barClass}`} aria-hidden />

      <div className="flex flex-1 items-start gap-3 pl-2">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Briefcase className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{session.role}</h3>
            <Badge variant="secondary">{session.type}</Badge>
          </div>

          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {formatSessionDate(session.date)}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {session.targetCompany && (
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {session.targetCompany}
              </span>
            )}

            {session.targetRole && <span>{session.targetRole}</span>}

            {session.mode && <span>{String(session.mode)}</span>}

            {String(session.mode || "").toLowerCase() === "video" &&
              typeof session.overallPresentationScore === "number" && (
                <span>Presentation {session.overallPresentationScore}%</span>
              )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <div className="text-right">
          <Badge variant="outline" className={`mb-1 ${tier.badgeClass}`}>
            {tier.label}
          </Badge>

          <div className={`font-display text-2xl font-bold ${tier.numberClass}`}>
            {session.score > 0 ? `${session.score}%` : "--"}
          </div>
        </div>

        <a
          href={detailHref}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          View session
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
