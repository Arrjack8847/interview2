import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  BarChart3,
  Briefcase,
  Crosshair,
  ExternalLink,
  FileText,
  Folder,
  GraduationCap,
  MessageSquareText,
  RefreshCw,
  Sparkles,
  Target,
  Trash2,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { RequireAuth } from "@/components/RequireAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { recommendCompanies, type CompanyRecommendationResponse } from "@/lib/api";
import { uploadResumeForUser } from "@/lib/resumeService";

export const Route = createFileRoute("/resume")({
  head: () => ({
    meta: [
      { title: "Resume — InterviewReady AI" },
      {
        name: "description",
        content:
          "Upload your resume and let InterviewReady AI analyze your skills, projects, strengths, weaknesses, and recommended roles.",
      },
      { property: "og:title", content: "Resume — InterviewReady AI" },
      {
        property: "og:description",
        content: "Manage your resume for personalized interview practice.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <ResumePage />
    </RequireAuth>
  ),
});

type ResumeData = {
  resumeId: string;
  fileName: string;
  fileUrl: string;
  filePath: string;
  fileType?: string;
  fileSize?: number;
  uploadedAt: string;

  skills: string[];
  projects: string[];
  recommendedRoles: string[];
  recommendedCompanyTypes: string[];
  interviewFocusAreas: string[];
  strongAreas: string[];
  weakAreas: string[];
  parsedExperience: string[];

  summary: string;
  education: string;
  careerLevel: string;
  source?: string;
  warning?: string;
};

const RESUME_STORAGE_KEY = "ir.resume";
const COMPANY_RECOMMENDATION_STORAGE_KEY = "ir.companyRecommendations";
const SELECTED_INTERVIEW_TARGET_KEY = "ir.selectedInterviewTarget";

function ResumePage() {
  const { user } = useAuth();

  const [resume, setResume] = useState<ResumeData | null>(null);
  const [companyRecommendations, setCompanyRecommendations] =
    useState<CompanyRecommendationResponse | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [recommending, setRecommending] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedResume = localStorage.getItem(RESUME_STORAGE_KEY);

    if (savedResume) {
      try {
        setResume(JSON.parse(savedResume) as ResumeData);
      } catch {
        localStorage.removeItem(RESUME_STORAGE_KEY);
      }
    }

    const savedRecommendations = localStorage.getItem(COMPANY_RECOMMENDATION_STORAGE_KEY);

    if (savedRecommendations) {
      try {
        setCompanyRecommendations(
          JSON.parse(savedRecommendations) as CompanyRecommendationResponse,
        );
      } catch {
        localStorage.removeItem(COMPANY_RECOMMENDATION_STORAGE_KEY);
      }
    }
  }, []);

  const handleResumeUpload = async (file: File) => {
    if (!user) {
      setError("You must be logged in to upload a resume.");
      return;
    }

    const isAllowedFile =
      file.name.toLowerCase().endsWith(".pdf") || file.name.toLowerCase().endsWith(".docx");

    if (!isAllowedFile) {
      setError("Please upload a PDF or DOCX resume.");
      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      setError("Resume file is too large. Please upload a file smaller than 5MB.");
      return;
    }

    try {
      setError("");
      setUploading(true);

      const result = await uploadResumeForUser({
        file,
      });

      const uploadedResume: ResumeData = {
        resumeId: result.resumeId,
        fileName: result.fileName,
        fileUrl: result.fileUrl,
        filePath: result.filePath,
        fileType: file.type || "Unknown file type",
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),

        skills: result.parsedSkills || [],
        projects: result.parsedProjects || [],
        recommendedRoles: result.recommendedRoles || [],
        recommendedCompanyTypes: result.recommendedCompanyTypes || [],
        interviewFocusAreas: result.interviewFocusAreas || [],
        strongAreas: result.strongAreas || [],
        weakAreas: result.weakAreas || [],
        parsedExperience: result.parsedExperience || [],

        summary: result.resumeSummary || "Resume uploaded successfully.",
        education: result.parsedEducation || "",
        careerLevel: result.careerLevel || "Student / entry-level candidate",
        source: result.source,
        warning: result.warning,
      };

      setResume(uploadedResume);
      localStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify(uploadedResume));

      setCompanyRecommendations(null);
      localStorage.removeItem(COMPANY_RECOMMENDATION_STORAGE_KEY);
      localStorage.removeItem(SELECTED_INTERVIEW_TARGET_KEY);
    } catch (error) {
      console.error("Resume upload failed:", error);

      setError(error instanceof Error ? error.message : "Resume upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateCompanyRecommendations = async () => {
    if (!resume) {
      setError("Please upload and analyze a resume first.");
      return;
    }

    try {
      setError("");
      setRecommending(true);

      const result = await recommendCompanies({
        resumeSummary: resume.summary,
        resumeSkills: resume.skills,
        resumeProjects: resume.projects,
        resumeEducation: resume.education,
        recommendedRoles: resume.recommendedRoles,
        recommendedCompanyTypes: resume.recommendedCompanyTypes,
        targetLocation: "Malaysia",
      });

      setCompanyRecommendations(result);
      localStorage.setItem(COMPANY_RECOMMENDATION_STORAGE_KEY, JSON.stringify(result));
    } catch (error) {
      console.error("Company recommendation failed:", error);

      setError(
        error instanceof Error ? error.message : "Company recommendation failed. Please try again.",
      );
    } finally {
      setRecommending(false);
    }
  };

  const handleUseRecommendation = ({
    targetRole,
    targetCompany,
    companyType,
  }: {
    targetRole?: string;
    targetCompany?: string;
    companyType?: string;
  }) => {
    const selectedTarget = {
      targetRole: targetRole || "",
      targetCompany: targetCompany || "",
      companyType: companyType || "",
      selectedAt: new Date().toISOString(),
    };

    localStorage.setItem(SELECTED_INTERVIEW_TARGET_KEY, JSON.stringify(selectedTarget));
    setError("");

    window.location.href = "/start";
  };

  const handleDeleteResume = () => {
    setResume(null);
    setCompanyRecommendations(null);
    setError("");
    localStorage.removeItem(RESUME_STORAGE_KEY);
    localStorage.removeItem(COMPANY_RECOMMENDATION_STORAGE_KEY);
    localStorage.removeItem(SELECTED_INTERVIEW_TARGET_KEY);
  };

  return (
    <main className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-background">
      <div className="pointer-events-none absolute left-[-90px] top-[210px] h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute right-[-110px] top-10 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-120px] left-[-120px] h-80 w-80 rounded-full bg-purple-200/30 blur-3xl" />

      <div className="pointer-events-none absolute left-0 top-56 hidden h-48 w-28 bg-[radial-gradient(circle,_hsl(var(--primary)/0.22)_1.5px,_transparent_1.5px)] [background-size:18px_18px] lg:block" />
      <div className="pointer-events-none absolute bottom-24 right-8 hidden h-48 w-48 bg-[radial-gradient(circle,_hsl(var(--primary)/0.16)_1.5px,_transparent_1.5px)] [background-size:18px_18px] lg:block" />

      <div className="relative mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-4xl text-center">
          <div className="flex flex-col items-center justify-center gap-6 md:flex-row md:text-left">
            <div className="grid h-24 w-24 shrink-0 place-items-center rounded-3xl bg-card/80 text-primary shadow-elegant ring-1 ring-border backdrop-blur">
              <FileText className="h-12 w-12" />
            </div>

            <div>
              <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Resume <span className="text-primary-gradient">Intelligence</span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                Upload your resume and let InterviewReady AI understand your skills, projects,
                education, strengths, weaknesses, and interview focus areas.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <FeaturePill icon={BarChart3} label="Resume Analysis" />
            <FeaturePill icon={MessageSquareText} label="Personalized Questions" />
            <FeaturePill icon={Crosshair} label="Role Matching" />
          </div>
        </section>

        {error && (
          <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        <section className="mx-auto mt-8 max-w-3xl rounded-[2rem] border border-border bg-card/95 p-5 shadow-elegant backdrop-blur sm:p-7">
          <div className="rounded-[1.5rem] border border-dashed border-border bg-background/50 px-6 py-10 text-center sm:px-10 sm:py-12">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-primary/10 text-primary">
              {uploading ? (
                <RefreshCw className="h-10 w-10 animate-spin" />
              ) : (
                <Upload className="h-10 w-10" />
              )}
            </div>

            <h2 className="mt-6 font-display text-2xl font-bold text-foreground">
              {resume ? "Replace your resume" : "Upload your resume"}
            </h2>

            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              PDF or DOCX only. Maximum file size: 5MB.
            </p>

            <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-muted-foreground">
              We securely analyze your resume to generate personalized interview questions and help
              you practice smarter.
            </p>

            <label
              className={`mt-7 inline-flex items-center justify-center rounded-xl bg-primary-gradient px-6 py-3 text-sm font-semibold text-primary-foreground shadow-elegant transition hover:opacity-90 ${
                uploading ? "cursor-not-allowed opacity-70" : "cursor-pointer"
              }`}
            >
              {uploading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : resume ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Replace Resume
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Resume
                </>
              )}

              <input
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];

                  if (file) {
                    void handleResumeUpload(file);
                  }

                  event.target.value = "";
                }}
              />
            </label>
          </div>
        </section>

        {resume ? (
          <section className="mx-auto mt-5 max-w-3xl rounded-[1.75rem] border border-border bg-card/95 p-6 shadow-elegant backdrop-blur">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-4">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <FileText className="h-7 w-7" />
                </span>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Current resume
                  </p>

                  <h3 className="mt-1 font-display text-lg font-semibold text-foreground">
                    {resume.fileName}
                  </h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatFileSize(resume.fileSize || 0)} · Uploaded{" "}
                    {formatDate(resume.uploadedAt)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <a href={resume.fileUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open file
                  </a>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteResume}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove
                </Button>
              </div>
            </div>

            {resume.warning && (
              <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                <div className="flex gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{resume.warning}</span>
                </div>
              </div>
            )}

            <div className="mt-5 rounded-2xl border border-border bg-background/70 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Resume summary
              </p>

              <p className="mt-2 text-sm leading-relaxed text-foreground">{resume.summary}</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {resume.education && (
                  <InfoLine label="Education" value={resume.education} icon={GraduationCap} />
                )}

                {resume.careerLevel && (
                  <InfoLine label="Career level" value={resume.careerLevel} icon={Target} />
                )}
              </div>
            </div>
          </section>
        ) : (
          <section className="mx-auto mt-5 max-w-3xl rounded-[1.75rem] border border-border bg-card/95 p-6 shadow-elegant backdrop-blur">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <Folder className="h-7 w-7" />
              </span>

              <div>
                <h3 className="font-display text-base font-semibold text-foreground">
                  No resume uploaded yet.
                </h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  Upload a resume to unlock personalized interview questions and feedback.
                </p>
              </div>
            </div>
          </section>
        )}

        {resume && (
          <section className="mt-8 rounded-[2rem] border border-border bg-card/95 p-6 shadow-elegant backdrop-blur">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold">AI company recommendation</h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Generate suitable roles, company types, and target companies based on your resume
                  analysis.
                </p>
              </div>

              <Button
                onClick={handleGenerateCompanyRecommendations}
                disabled={recommending}
                className="bg-primary-gradient text-primary-foreground shadow-elegant hover:opacity-90"
              >
                {recommending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Recommendations
                  </>
                )}
              </Button>
            </div>

            {companyRecommendations?.warning && (
              <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                {companyRecommendations.warning}
              </div>
            )}
          </section>
        )}

        {resume && (
          <section className="mt-8 grid gap-6 lg:grid-cols-3">
            <PreviewPanel title="Skills detected">
              <BadgeList
                items={resume.skills}
                emptyText="No skills detected yet. Try uploading a clearer resume."
              />
            </PreviewPanel>

            <PreviewPanel title="Projects detected">
              <BulletList
                items={resume.projects}
                emptyText="No projects detected yet. Add project names and descriptions to your resume."
              />
            </PreviewPanel>

            <PreviewPanel title="Recommended roles">
              <BulletList items={resume.recommendedRoles} emptyText="No recommended roles yet." />
            </PreviewPanel>

            <PreviewPanel title="Recommended company types">
              <BulletList
                items={resume.recommendedCompanyTypes}
                emptyText="No company type recommendations yet."
              />
            </PreviewPanel>

            <PreviewPanel title="Strong areas">
              <BulletList items={resume.strongAreas} emptyText="No strong areas detected yet." />
            </PreviewPanel>

            <PreviewPanel title="Weak areas to improve">
              <BulletList items={resume.weakAreas} emptyText="No weak areas detected yet." />
            </PreviewPanel>

            <PreviewPanel title="Experience detected">
              <BulletList items={resume.parsedExperience} emptyText="No experience detected yet." />
            </PreviewPanel>

            <PreviewPanel title="Interview focus areas">
              <BulletList
                items={resume.interviewFocusAreas}
                emptyText="No interview focus areas yet."
              />
            </PreviewPanel>

            <PreviewPanel title="Analysis status">
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium text-foreground">Source:</span>{" "}
                  <span className="text-muted-foreground">
                    {resume.source === "local-fallback"
                      ? "Local fallback"
                      : resume.source === "ai"
                        ? "AI analysis"
                        : "Resume analysis"}
                  </span>
                </p>

                <p className="text-muted-foreground">
                  This data will be used to generate personalized interview questions.
                </p>
              </div>
            </PreviewPanel>
          </section>
        )}

        {companyRecommendations && (
          <section className="mt-8 grid gap-6 lg:grid-cols-3">
            <PreviewPanel title="Role match">
              <ul className="space-y-4 text-sm">
                {companyRecommendations.recommendedRoles.map((item) => (
                  <li
                    key={item.role}
                    className="rounded-2xl border border-border bg-background p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{item.role}</p>
                        <p className="mt-1 text-muted-foreground">{item.reason}</p>

                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-3"
                          onClick={() =>
                            handleUseRecommendation({
                              targetRole: item.role,
                            })
                          }
                        >
                          Use this role
                        </Button>
                      </div>

                      <Badge variant="secondary">{item.matchScore}%</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </PreviewPanel>

            <PreviewPanel title="Suggested companies">
              <ul className="space-y-4 text-sm">
                {companyRecommendations.suggestedCompanies.map((company) => (
                  <li
                    key={`${company.name}-${company.type}`}
                    className="rounded-2xl border border-border bg-background p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{company.name}</p>
                        <p className="text-xs text-muted-foreground">{company.type}</p>
                        <p className="mt-2 text-muted-foreground">{company.reason}</p>

                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-3"
                          onClick={() =>
                            handleUseRecommendation({
                              targetCompany: company.name,
                              companyType: company.type,
                            })
                          }
                        >
                          Use this company
                        </Button>
                      </div>

                      <Badge variant="secondary">{company.matchScore}%</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </PreviewPanel>

            <PreviewPanel title="Interview focus">
              <BulletList
                items={companyRecommendations.interviewFocusAreas}
                emptyText="No interview focus areas generated yet."
              />

              <div className="mt-5">
                <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                  Company types
                </p>

                <BadgeList
                  items={companyRecommendations.recommendedCompanyTypes}
                  emptyText="No company types generated yet."
                />
              </div>
            </PreviewPanel>
          </section>
        )}

        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="bg-primary-gradient text-primary-foreground shadow-elegant hover:opacity-90"
          >
            <Link to="/start">Start Interview</Link>
          </Button>

          <Button asChild size="lg" variant="outline">
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

function FeaturePill({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-5 py-3 text-sm font-medium text-primary shadow-sm ring-1 ring-primary/10">
      <Icon className="h-4 w-4" />
      {label}
    </span>
  );
}

function formatFileSize(bytes: number) {
  if (!bytes) return "Unknown size";

  const mb = bytes / (1024 * 1024);

  if (mb >= 1) {
    return `${mb.toFixed(2)} MB`;
  }

  return `${Math.round(bytes / 1024)} KB`;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "recently";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function BadgeList({ items, emptyText }: { items: string[]; emptyText: string }) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Badge key={item} variant="secondary">
          {item}
        </Badge>
      ))}
    </div>
  );
}

function BulletList({ items, emptyText }: { items: string[]; emptyText: string }) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <ul className="space-y-2 text-sm">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function PreviewPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-elegant">
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function InfoLine({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/70 p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {label}
      </div>

      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
