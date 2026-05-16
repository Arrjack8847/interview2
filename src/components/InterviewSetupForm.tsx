import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { generateCompanyContext, type CompanyContextResponse } from "@/lib/api";
import { createInterviewSession } from "@/lib/supabaseService";
import type {
  Difficulty,
  InterviewMode,
  InterviewSetup,
  InterviewType,
  JobRole,
  ResumePreview,
} from "@/lib/types";

const ROLES: JobRole[] = [
  "IT Support Intern",
  "Software Developer Intern",
  "Network Administrator",
  "Cybersecurity Intern",
  "Customer Service Assistant",
];

const TYPES: InterviewType[] = ["HR Interview", "Technical Interview", "Behavioral Interview"];

const DIFFICULTIES: Difficulty[] = ["Beginner", "Intermediate", "Advanced"];

const MODES: InterviewMode[] = ["Text", "Voice", "Video"];

const QUESTION_COUNTS = [3, 5, 10];

const RESUME_STORAGE_KEY = "ir.resume";
const SELECTED_INTERVIEW_TARGET_KEY = "ir.selectedInterviewTarget";
const COMPANY_CONTEXT_STORAGE_KEY = "ir.companyContext";

type SavedResume = ResumePreview & {
  resumeId?: string;
  fileName: string;
  fileUrl?: string;
  filePath?: string;
  fileSize?: number;
  uploadedAt?: string;

  skills?: string[];
  projects?: string[];
  targetRoles?: string[];

  recommendedRoles?: string[];
  recommendedCompanyTypes?: string[];
  interviewFocusAreas?: string[];
  strongAreas?: string[];
  weakAreas?: string[];
  parsedExperience?: string[];

  summary?: string;
  education?: string;
  careerLevel?: string;
  source?: string;
  warning?: string;
};

type SelectedInterviewTarget = {
  targetRole?: string;
  targetCompany?: string;
  companyType?: string;
  selectedAt?: string;
};

function getUserId(user: unknown) {
  const typedUser = user as { id?: string; uid?: string } | null;

  return typedUser?.id || typedUser?.uid || "";
}

function readSavedResume() {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(RESUME_STORAGE_KEY);

  if (!raw) return null;

  try {
    return JSON.parse(raw) as SavedResume;
  } catch {
    localStorage.removeItem(RESUME_STORAGE_KEY);
    return null;
  }
}

function readSelectedInterviewTarget() {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(SELECTED_INTERVIEW_TARGET_KEY);

  if (!raw) return null;

  try {
    return JSON.parse(raw) as SelectedInterviewTarget;
  } catch {
    localStorage.removeItem(SELECTED_INTERVIEW_TARGET_KEY);
    return null;
  }
}

function readSavedCompanyContext() {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(COMPANY_CONTEXT_STORAGE_KEY);

  if (!raw) return null;

  try {
    return JSON.parse(raw) as CompanyContextResponse;
  } catch {
    localStorage.removeItem(COMPANY_CONTEXT_STORAGE_KEY);
    return null;
  }
}

function getBestResumeRole(resume: SavedResume | null) {
  if (!resume) return "";

  const recommendedRole = resume.recommendedRoles?.[0];
  const targetRole = resume.targetRoles?.[0];

  return recommendedRole || targetRole || "";
}

export function InterviewSetupForm() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [role, setRole] = useState<JobRole>("IT Support Intern");
  const [type, setType] = useState<InterviewType>("Technical Interview");
  const [difficulty, setDifficulty] = useState<Difficulty>("Beginner");
  const [questionCount, setQuestionCount] = useState<number>(5);

  const [targetCompany, setTargetCompany] = useState("");
  const [targetRole, setTargetRole] = useState("IT Support Intern");
  const [selectedCompanyType, setSelectedCompanyType] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [mode, setMode] = useState<InterviewMode>("Text");

  const [resume, setResume] = useState<SavedResume | null>(null);
  const [companyContext, setCompanyContext] = useState<CompanyContextResponse | null>(null);
  const [error, setError] = useState("");
  const [researchingCompany, setResearchingCompany] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedResume = readSavedResume();
    const selectedTarget = readSelectedInterviewTarget();
    const savedCompanyContext = readSavedCompanyContext();

    if (savedResume) {
      setResume(savedResume);

      const bestResumeRole = getBestResumeRole(savedResume);

      if (bestResumeRole) {
        setTargetRole(bestResumeRole);
      }
    }

    if (selectedTarget?.targetRole) {
      setTargetRole(selectedTarget.targetRole);
    }

    if (selectedTarget?.targetCompany) {
      setTargetCompany(selectedTarget.targetCompany);
    }

    if (selectedTarget?.companyType) {
      setSelectedCompanyType(selectedTarget.companyType);
    }

    if (savedCompanyContext) {
      const selectedCompany = selectedTarget?.targetCompany?.trim().toLowerCase();
      const savedCompany = savedCompanyContext.companyName?.trim().toLowerCase();

      if (!selectedCompany || selectedCompany === savedCompany) {
        setCompanyContext(savedCompanyContext);
      } else {
        localStorage.removeItem(COMPANY_CONTEXT_STORAGE_KEY);
      }
    }
  }, []);

  const clearCompanyContext = () => {
    setCompanyContext(null);
    localStorage.removeItem(COMPANY_CONTEXT_STORAGE_KEY);
  };

  const handleRemoveSelectedTarget = () => {
    setTargetCompany("");
    setSelectedCompanyType("");
    clearCompanyContext();
    localStorage.removeItem(SELECTED_INTERVIEW_TARGET_KEY);
  };

  const handleResearchCompany = async () => {
    const cleanCompany = targetCompany.trim();
    const finalTargetRole = targetRole.trim() || role;

    if (!cleanCompany) {
      setError("Enter or select a target company before researching.");
      return;
    }

    try {
      setError("");
      setResearchingCompany(true);

      const context = await generateCompanyContext({
        targetCompany: cleanCompany,
        targetRole: finalTargetRole,
        jobDescription: jobDescription.trim(),
        resumeSummary: resume?.summary || "",
        resumeSkills: resume?.skills || [],
        resumeProjects: resume?.projects || [],
      });

      setCompanyContext(context);
      localStorage.setItem(COMPANY_CONTEXT_STORAGE_KEY, JSON.stringify(context));
    } catch (error) {
      console.error("Failed to research company:", error);
      setError(
        error instanceof Error ? error.message : "Company research failed. Please try again.",
      );
    } finally {
      setResearchingCompany(false);
    }
  };

  const buildSetup = (): InterviewSetup => {
    const finalTargetRole = targetRole.trim() || role;

    return {
      role,
      targetCompany: targetCompany.trim(),
      targetRole: finalTargetRole,
      jobDescription: jobDescription.trim(),
      resumeId: resume?.resumeId || "",
      mode,
      type,
      difficulty,
      questionCount,
      resume: resume
        ? {
            fileName: resume.fileName,
            fileUrl: resume.fileUrl,
            fileSize: resume.fileSize,
            uploadedAt: resume.uploadedAt,
            skills: resume.skills || [],
            projects: resume.projects || [],
            targetRoles: resume.recommendedRoles || resume.targetRoles || [],
            summary: resume.summary || "",
            education: resume.education || "",
          }
        : undefined,
      resumeSummary: resume?.summary || "",
      resumeSkills: resume?.skills || [],
      resumeProjects: resume?.projects || [],
      resumeEducation: resume?.education || "",
      companyContext: companyContext || undefined,
    };
  };

  const handleStart = async () => {
    if (starting) return;

    const userId = getUserId(user);

    if (!userId) {
      setError("You must be logged in to start an interview.");
      return;
    }

    try {
      setError("");
      setStarting(true);

      const setup = buildSetup();
      const attemptId = crypto.randomUUID();

      localStorage.removeItem("ir.sessionId");
      localStorage.removeItem("ir.session");
      localStorage.removeItem("ir.report");
      localStorage.removeItem("ir.activeAttemptId");

      const sessionId = await createInterviewSession({
        userId,
        setup,
        attemptId,
      });

      localStorage.setItem("ir.setup", JSON.stringify(setup));
      localStorage.setItem("ir.sessionId", sessionId);
      localStorage.setItem("ir.activeAttemptId", attemptId);
      localStorage.removeItem(SELECTED_INTERVIEW_TARGET_KEY);

      navigate({ to: "/interview" });
    } catch (error) {
      console.error("Failed to start interview session:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to start interview session. Please try again.",
      );
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {(targetCompany || selectedCompanyType) && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">Selected recommendation</p>

              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                {targetCompany && (
                  <p>
                    <span className="font-medium text-foreground">Company:</span> {targetCompany}
                  </p>
                )}

                {targetRole && (
                  <p>
                    <span className="font-medium text-foreground">Role:</span> {targetRole}
                  </p>
                )}

                {selectedCompanyType && (
                  <p>
                    <span className="font-medium text-foreground">Company type:</span>{" "}
                    {selectedCompanyType}
                  </p>
                )}
              </div>
            </div>

            <Button type="button" variant="outline" size="sm" onClick={handleRemoveSelectedTarget}>
              Clear selection
            </Button>
          </div>
        </div>
      )}

      {companyContext && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">Company interview prep</p>
              <h3 className="text-lg font-semibold text-foreground">
                {companyContext.companyName}
              </h3>
              <p className="text-sm text-muted-foreground">
                {companyContext.targetRole} | {companyContext.industry}
              </p>
            </div>

            <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
              {companyContext.source}
            </span>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {companyContext.companyOverview}
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <CompanyContextList title="Role expectations" items={companyContext.roleExpectations} />
            <CompanyContextList
              title="Company challenges"
              items={companyContext.companyChallenges}
            />
            <CompanyContextList
              title="Scenario angles"
              items={companyContext.scenarioQuestionAngles}
            />
            <CompanyContextList
              title="Interview focus"
              items={companyContext.interviewFocusAreas}
            />
          </div>

          {companyContext.sourceUrls.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-foreground">Sources</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {companyContext.sourceUrls.map((url, index) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition hover:border-primary hover:text-primary"
                  >
                    Source {index + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          {companyContext.warning && (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {companyContext.warning}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Job category">
          <Select value={role} onValueChange={(value) => setRole(value as JobRole)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              {ROLES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Target job role">
          <input
            value={targetRole}
            onChange={(event) => {
              setTargetRole(event.target.value);
              clearCompanyContext();
            }}
            placeholder="Example: Software Developer Intern"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </Field>

        <Field label="Target company">
          <input
            value={targetCompany}
            onChange={(event) => {
              setTargetCompany(event.target.value);
              setSelectedCompanyType("");
              clearCompanyContext();
            }}
            placeholder="Example: Google, Maybank, AirAsia"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResearchCompany}
            disabled={researchingCompany || !targetCompany.trim()}
            className="mt-3"
          >
            {researchingCompany ? "Researching..." : "Research Company"}
          </Button>

          {selectedCompanyType && (
            <p className="mt-2 text-xs text-muted-foreground">
              Selected company type: {selectedCompanyType}
            </p>
          )}
        </Field>

        <Field label="Interview type">
          <Select value={type} onValueChange={(value) => setType(value as InterviewType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              {TYPES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Difficulty">
          <Select value={difficulty} onValueChange={(value) => setDifficulty(value as Difficulty)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              {DIFFICULTIES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Interview mode">
          <Select value={mode} onValueChange={(value) => setMode(value as InterviewMode)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              {MODES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Number of questions">
          <Select
            value={String(questionCount)}
            onValueChange={(value) => setQuestionCount(Number(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              {QUESTION_COUNTS.map((count) => (
                <SelectItem key={count} value={String(count)}>
                  {count} questions
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Resume analysis">
          {resume ? (
            <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <div className="font-medium text-foreground">Selected: {resume.fileName}</div>

              {resume.summary && <div className="mt-1 line-clamp-2">{resume.summary}</div>}

              {(resume.skills || []).length > 0 && (
                <div className="mt-2">Skills: {(resume.skills || []).join(", ")}</div>
              )}

              {(resume.recommendedRoles || []).length > 0 && (
                <div className="mt-1">
                  Recommended roles: {(resume.recommendedRoles || []).join(", ")}
                </div>
              )}

              <Button asChild type="button" variant="outline" size="sm" className="mt-3">
                <Link to="/resume">Manage Resume</Link>
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              No analyzed resume found. Upload your resume first for personalized questions.
              <div className="mt-3">
                <Button asChild type="button" variant="outline" size="sm">
                  <Link to="/resume">Upload Resume</Link>
                </Button>
              </div>
            </div>
          )}
        </Field>

        <div className="sm:col-span-2">
          <Field label="Job description optional">
            <textarea
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Paste job description here..."
              className="min-h-28 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </Field>
        </div>
      </div>

      <Button
        size="lg"
        onClick={handleStart}
        disabled={starting}
        className="w-full bg-primary-gradient text-primary-foreground shadow-elegant hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {starting ? "Starting Interview..." : "Start Interview"}
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}

function CompanyContextList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;

  return (
    <div>
      <p className="text-xs font-medium text-foreground">{title}</p>
      <ul className="mt-2 space-y-1 text-xs leading-relaxed text-muted-foreground">
        {items.slice(0, 4).map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </div>
  );
}
