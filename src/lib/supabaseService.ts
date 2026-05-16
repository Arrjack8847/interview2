import { requireSupabaseConfig, supabase } from "@/lib/supabase";
import type {
  Feedback,
  FinalReport,
  InterviewSetup,
  Question,
  SpeechMetrics,
  VisualMetrics,
} from "@/lib/types";

type SupabaseInterviewMode = "text" | "voice" | "video";
type InterviewSessionStatus = "in-progress" | "completed" | "cancelled";
type StoredQuestion = Question & Record<string, unknown>;

type ExtendedInterviewSetup = Omit<InterviewSetup, "mode"> & {
  targetRole?: string;
  targetCompany?: string;
  jobDescription?: string;
  resumeId?: string;
  mode?: InterviewSetup["mode"] | SupabaseInterviewMode;
};

export interface SavedInterviewSessionInput {
  userId: string;
  setup: ExtendedInterviewSetup;
  attemptId: string;
}

export interface SavedAnswerInput {
  sessionId: string;
  userId: string;
  question: Question;
  answer: string;
  feedback: Feedback;
}

export interface SavedSpeechMetricsInput {
  sessionId: string;
  userId: string;
  metrics: SpeechMetrics;
}

export interface SavedVisualMetricsInput {
  sessionId: string;
  userId: string;
  metrics: VisualMetrics;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ResumeRecord {
  id: string;
  userId: string;
  fileName: string;
  fileUrl: string;
  filePath?: string;
  extractedText: string;
  parsedSkills: string[];
  parsedProjects: string[];
  parsedEducation: string;
  parsedExperience?: string[];
  resumeSummary: string;
  careerLevel?: string;
  strongAreas?: string[];
  weakAreas?: string[];
  recommendedRoles?: string[];
  recommendedCompanyTypes?: string[];
  interviewFocusAreas?: string[];
  analysisStatus?: string;
  uploadedAt?: string;
  analyzedAt?: string;
}

interface ProfileRow {
  id: string;
  name: string | null;
  email: string | null;
  created_at?: string;
  updated_at?: string;
}

interface InterviewSessionRow {
  id: string;
  user_id: string;
  resume_id: string | null;
  role: string;
  target_role: string;
  target_company: string;
  job_description: string;
  type: string;
  interview_type: string;
  difficulty: string;
  mode: SupabaseInterviewMode;
  question_count: number;
  status: InterviewSessionStatus;
  overall_score: number | null;
  final_report: FinalReport | null;
  generated_questions: StoredQuestion[] | null;
  current_question_index: number | null;
  attempt_id: string | null;
  created_at: string;
  updated_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
}

interface AnswerRow {
  id: string;
  session_id: string;
  user_id: string;
  question_id: number;
  question_text: string;
  answer_text: string;
  feedback: Feedback | null;
  scores: Record<string, number> | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  improved_answer: string | null;
  summary: string | null;
  interview_tip: string | null;
  created_at: string;
}

interface MetricsRow<TMetrics> {
  id: string;
  session_id: string;
  user_id: string;
  metrics: TMetrics;
  created_at: string;
}

function normalizeInterviewMode(
  mode?: InterviewSetup["mode"] | SupabaseInterviewMode,
): SupabaseInterviewMode {
  const normalized = String(mode || "text").toLowerCase();

  if (normalized === "voice") return "voice";
  if (normalized === "video") return "video";

  return "text";
}

function toNullableUuid(value?: string) {
  return value && value.trim() ? value : null;
}

function mapProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    name: row.name || "",
    email: row.email || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSession(row: InterviewSessionRow) {
  return {
    id: row.id,
    userId: row.user_id,
    resumeId: row.resume_id || "",
    role: row.role,
    targetRole: row.target_role,
    targetCompany: row.target_company,
    jobDescription: row.job_description,
    type: row.type,
    interviewType: row.interview_type,
    difficulty: row.difficulty,
    mode: row.mode,
    questionCount: row.question_count,
    status: row.status,
    overallScore: row.overall_score,
    finalReport: row.final_report,
    generatedQuestions: row.generated_questions || [],
    currentQuestionIndex: row.current_question_index || 0,
    attemptId: row.attempt_id || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at || "",
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
  };
}

function mapAnswer(row: AnswerRow) {
  return {
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    questionId: row.question_id,
    questionText: row.question_text,
    answerText: row.answer_text,
    feedback: row.feedback,
    scores: row.scores,
    strengths: row.strengths || [],
    weaknesses: row.weaknesses || [],
    improvedAnswer: row.improved_answer,
    summary: row.summary,
    interviewTip: row.interview_tip,
    createdAt: row.created_at,
  };
}

function mapMetrics<TMetrics>(row: MetricsRow<TMetrics>) {
  return {
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    metrics: row.metrics,
    createdAt: row.created_at,
  };
}

function throwIfSupabaseError(error: unknown, fallback: string): never {
  if (error instanceof Error) {
    throw error;
  }

  throw new Error(fallback);
}

export async function createUserProfile({
  userId,
  name,
  email,
}: {
  userId: string;
  name: string;
  email: string;
}) {
  requireSupabaseConfig();

  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      name,
      email,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    throwIfSupabaseError(error, "Could not save your profile.");
  }
}

export async function getUserProfile(userId: string) {
  requireSupabaseConfig();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throwIfSupabaseError(error, "Could not load your profile.");
  }

  return data ? mapProfile(data) : null;
}

export async function createResumeRecord({
  userId,
  fileName,
  fileUrl = "",
  filePath = "",
  extractedText = "",
  parsedSkills = [],
  parsedProjects = [],
  parsedEducation = "",
  resumeSummary = "",
}: {
  userId?: string;
  fileName: string;
  fileUrl?: string;
  filePath?: string;
  extractedText?: string;
  parsedSkills?: string[];
  parsedProjects?: string[];
  parsedEducation?: string;
  resumeSummary?: string;
}) {
  requireSupabaseConfig();

  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new Error("User is not logged in.");
  }

  const finalUserId = authData.user.id;

  if (userId && userId !== finalUserId) {
    console.warn("Resume userId mismatch detected. Using Supabase Auth user id.", {
      passedUserId: userId,
      authUserId: finalUserId,
    });
  }

  const { data, error } = await supabase
    .from("resumes")
    .insert({
      user_id: finalUserId,
      file_name: fileName,
      file_url: fileUrl,
      file_path: filePath,
      extracted_text: extractedText,
      parsed_skills: parsedSkills,
      parsed_projects: parsedProjects,
      parsed_education: parsedEducation,
      resume_summary: resumeSummary,
      analysis_status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    throwIfSupabaseError(error, "Could not save your resume record.");
  }

  return data.id as string;
}

export async function createInterviewSession({
  userId,
  setup,
  attemptId,
}: SavedInterviewSessionInput) {
  requireSupabaseConfig();

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("interview_sessions")
    .insert({
      user_id: userId,
      resume_id: toNullableUuid(setup.resumeId),
      role: setup.role,
      target_role: setup.targetRole || setup.role || "",
      target_company: setup.targetCompany || "",
      job_description: setup.jobDescription || "",
      type: setup.type,
      interview_type: setup.type,
      difficulty: setup.difficulty,
      mode: normalizeInterviewMode(setup.mode),
      question_count: setup.questionCount,
      status: "in-progress",
      overall_score: null,
      final_report: null,
      generated_questions: null,
      current_question_index: 0,
      attempt_id: attemptId,
      updated_at: now,
      completed_at: null,
      cancelled_at: null,
    })
    .select("id")
    .single();

  if (error) {
    throwIfSupabaseError(error, "Could not create the interview session.");
  }

  return data.id as string;
}

export async function updateInterviewSessionQuestions({
  sessionId,
  userId,
  questions,
}: {
  sessionId: string;
  userId: string;
  questions: Question[];
}) {
  requireSupabaseConfig();

  const { error } = await supabase
    .from("interview_sessions")
    .update({
      generated_questions: questions,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("user_id", userId);

  if (error) {
    throwIfSupabaseError(error, "Could not save generated interview questions.");
  }
}

export async function updateInterviewSessionProgress({
  sessionId,
  userId,
  currentQuestionIndex,
}: {
  sessionId: string;
  userId: string;
  currentQuestionIndex: number;
}) {
  requireSupabaseConfig();

  const { error } = await supabase
    .from("interview_sessions")
    .update({
      current_question_index: currentQuestionIndex,
      status: "in-progress",
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("user_id", userId);

  if (error) {
    throwIfSupabaseError(error, "Could not update interview progress.");
  }
}

export async function saveInterviewAnswer({
  sessionId,
  userId,
  question,
  answer,
  feedback,
}: SavedAnswerInput) {
  requireSupabaseConfig();

  const { data, error } = await supabase
    .from("answers")
    .upsert(
      {
        session_id: sessionId,
        user_id: userId,
        question_id: question.id,
        question_text: question.text,
        answer_text: answer,
        feedback,
        scores: {
          overall: feedback.overall,
          clarity: feedback.clarity,
          relevance: feedback.relevance,
          structure: feedback.structure,
          technicalAccuracy: feedback.technicalAccuracy,
        },
        strengths: feedback.strengths,
        weaknesses: feedback.weaknesses,
        improved_answer: feedback.improvedAnswer,
        summary: feedback.summary,
        interview_tip: feedback.interviewTip,
      },
      { onConflict: "session_id,question_id" },
    )
    .select("id")
    .single();

  if (error) {
    throwIfSupabaseError(error, "Could not save your answer.");
  }

  return data.id as string;
}

export async function completeInterviewSession({
  sessionId,
  userId,
  overallScore,
  finalReport,
}: {
  sessionId: string;
  userId: string;
  overallScore: number;
  finalReport?: FinalReport;
}) {
  requireSupabaseConfig();

  const { error } = await supabase
    .from("interview_sessions")
    .update({
      overall_score: overallScore,
      final_report: finalReport || null,
      status: "completed",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("user_id", userId);

  if (error) {
    throwIfSupabaseError(error, "Could not complete the interview session.");
  }
}

export async function cancelInterviewSession({
  sessionId,
  userId,
}: {
  sessionId: string;
  userId: string;
}) {
  requireSupabaseConfig();

  const now = new Date().toISOString();

  const { error } = await supabase
    .from("interview_sessions")
    .update({
      status: "cancelled",
      cancelled_at: now,
      updated_at: now,
    })
    .eq("id", sessionId)
    .eq("user_id", userId);

  if (error) {
    throwIfSupabaseError(error, "Could not cancel the interview session.");
  }
}

export async function getInterviewSession(sessionId: string) {
  requireSupabaseConfig();

  const { data, error } = await supabase
    .from("interview_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    throwIfSupabaseError(error, "Could not load the interview session.");
  }

  return data ? mapSession(data) : null;
}

export async function getUserInterviewSessions(userId: string) {
  requireSupabaseConfig();

  const { data, error } = await supabase
    .from("interview_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throwIfSupabaseError(error, "Could not load interview sessions.");
  }

  return (data || []).map(mapSession);
}

export async function getLatestInProgressSession(userId: string) {
  requireSupabaseConfig();

  const { data, error } = await supabase
    .from("interview_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "in-progress")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throwIfSupabaseError(error, "Could not load your active interview session.");
  }

  return data ? mapSession(data) : null;
}

export async function getSessionAnswers({
  sessionId,
  userId,
}: {
  sessionId: string;
  userId: string;
}) {
  requireSupabaseConfig();

  const { data, error } = await supabase
    .from("answers")
    .select("*")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .order("question_id", { ascending: true })
    .limit(50);

  if (error) {
    throwIfSupabaseError(error, "Could not load interview answers.");
  }

  return (data || []).map(mapAnswer);
}

export async function saveSpeechMetrics({ sessionId, userId, metrics }: SavedSpeechMetricsInput) {
  requireSupabaseConfig();

  const { data, error } = await supabase
    .from("speech_metrics")
    .insert({
      session_id: sessionId,
      user_id: userId,
      metrics,
    })
    .select("id")
    .single();

  if (error) {
    throwIfSupabaseError(error, "Could not save speech metrics.");
  }

  return data.id as string;
}

export async function saveVisualMetrics({ sessionId, userId, metrics }: SavedVisualMetricsInput) {
  requireSupabaseConfig();

  const { data, error } = await supabase
    .from("visual_metrics")
    .insert({
      session_id: sessionId,
      user_id: userId,
      metrics,
    })
    .select("id")
    .single();

  if (error) {
    throwIfSupabaseError(error, "Could not save visual metrics.");
  }

  return data.id as string;
}

export async function getSessionSpeechMetrics({
  sessionId,
  userId,
}: {
  sessionId: string;
  userId: string;
}) {
  requireSupabaseConfig();

  const { data, error } = await supabase
    .from("speech_metrics")
    .select("*")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throwIfSupabaseError(error, "Could not load speech metrics.");
  }

  return data ? mapMetrics(data as MetricsRow<SpeechMetrics>) : null;
}

export async function getSessionVisualMetrics({
  sessionId,
  userId,
}: {
  sessionId: string;
  userId: string;
}) {
  requireSupabaseConfig();

  const { data, error } = await supabase
    .from("visual_metrics")
    .select("*")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throwIfSupabaseError(error, "Could not load visual metrics.");
  }

  return data ? mapMetrics(data as MetricsRow<VisualMetrics>) : null;
}
