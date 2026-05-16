import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  FileText,
  Lightbulb,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Trophy,
  Video,
  Volume2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FeedbackCard } from "@/components/FeedbackCard";
import { RequireAuth } from "@/components/RequireAuth";
import { VideoReadinessCalibration } from "@/components/VideoReadinessCalibration";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { analyzeInterviewAnswer, generateFinalReport, generateInterviewQuestions } from "@/lib/api";
import {
  calculateSpeechMetrics,
  calculateVisualMetrics,
  enrichFinalReport,
  mergeVisualMetrics,
} from "@/lib/metrics";
import {
  cancelInterviewSession,
  completeInterviewSession,
  getInterviewSession,
  getSessionAnswers,
  saveSpeechMetrics,
  saveInterviewAnswer,
  saveVisualMetrics,
  updateInterviewSessionProgress,
  updateInterviewSessionQuestions,
} from "@/lib/supabaseService";
import type {
  AnswerWithFeedback,
  CompanyContext,
  Feedback,
  FinalReport,
  InterviewSetup,
  Question,
} from "@/lib/types";
import type { VideoPresentationMetrics } from "@/lib/videoPresentationAnalysis";

export const Route = createFileRoute("/interview")({
  head: () => ({
    meta: [
      { title: "Interview Room — InterviewReady AI" },
      {
        name: "description",
        content: "Live interview practice room with AI feedback after each answer.",
      },
      { property: "og:title", content: "Interview Room" },
      {
        property: "og:description",
        content: "Practice an AI interview in real time.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <InterviewRoom />
    </RequireAuth>
  ),
});

type InterviewModeLabel = "Text" | "Voice" | "Video" | "text" | "voice" | "video";

type ExtendedInterviewSetup = Omit<InterviewSetup, "mode"> & {
  targetCompany?: string;
  targetRole?: string;
  jobDescription?: string;
  mode?: InterviewModeLabel;
  resumeId?: string;
  resume?: {
    fileName?: string;
    fileUrl?: string;
  };
  resumeSummary?: string;
  resumeSkills?: string[];
  resumeProjects?: string[];
  resumeEducation?: string;
  companyContext?: CompanyContext;
};

type SavedInterviewSession = Awaited<ReturnType<typeof getInterviewSession>>;
type SavedInterviewAnswer = Awaited<ReturnType<typeof getSessionAnswers>>[number];

const TIPS = [
  "Use the STAR method: Situation, Task, Action, Result.",
  "Keep answers focused — 60–90 seconds is usually enough.",
  "Speak in concrete examples, not abstract claims.",
  "It's okay to pause and think before answering.",
];

const DEFAULT_SETUP: ExtendedInterviewSetup = {
  role: "IT Support Intern",
  targetCompany: "",
  targetRole: "IT Support Intern",
  jobDescription: "",
  mode: "Text",
  type: "Technical Interview",
  difficulty: "Beginner",
  questionCount: 5,
  resumeId: "",
  resume: undefined,
  resumeSummary: "",
  resumeSkills: [],
  resumeProjects: [],
  resumeEducation: "",
  companyContext: undefined,
};

function readSelectedInterviewTarget() {
  const raw =
    typeof window !== "undefined" ? localStorage.getItem("ir.selectedInterviewTarget") : null;

  if (!raw) {
    return {
      targetRole: "",
      targetCompany: "",
      companyType: "",
    };
  }

  try {
    return JSON.parse(raw) as {
      targetRole?: string;
      targetCompany?: string;
      companyType?: string;
      selectedAt?: string;
    };
  } catch {
    localStorage.removeItem("ir.selectedInterviewTarget");

    return {
      targetRole: "",
      targetCompany: "",
      companyType: "",
    };
  }
}

function readStoredSetup(): ExtendedInterviewSetup {
  const selectedTarget = readSelectedInterviewTarget();
  const raw = typeof window !== "undefined" ? localStorage.getItem("ir.setup") : null;

  if (!raw) {
    return {
      ...DEFAULT_SETUP,
      targetRole: selectedTarget.targetRole || DEFAULT_SETUP.targetRole,
      targetCompany: selectedTarget.targetCompany || DEFAULT_SETUP.targetCompany,
    };
  }

  try {
    const storedSetup = JSON.parse(raw) as ExtendedInterviewSetup;

    return {
      ...DEFAULT_SETUP,
      ...storedSetup,
      targetRole:
        storedSetup.targetRole ||
        selectedTarget.targetRole ||
        storedSetup.role ||
        DEFAULT_SETUP.targetRole,
      targetCompany:
        storedSetup.targetCompany || selectedTarget.targetCompany || DEFAULT_SETUP.targetCompany,
    };
  } catch {
    return {
      ...DEFAULT_SETUP,
      targetRole: selectedTarget.targetRole || DEFAULT_SETUP.targetRole,
      targetCompany: selectedTarget.targetCompany || DEFAULT_SETUP.targetCompany,
    };
  }
}
function buildSetupFromSession(
  session: NonNullable<SavedInterviewSession>,
  storedSetup: ExtendedInterviewSetup,
): ExtendedInterviewSetup {
  return {
    ...DEFAULT_SETUP,
    ...storedSetup,
    role: (session.role ||
      storedSetup.role ||
      DEFAULT_SETUP.role) as ExtendedInterviewSetup["role"],
    targetRole: session.targetRole || storedSetup.targetRole || storedSetup.role,
    targetCompany: session.targetCompany || storedSetup.targetCompany || "",
    jobDescription: session.jobDescription || storedSetup.jobDescription || "",
    resumeId: session.resumeId || storedSetup.resumeId || "",
    mode: session.mode || storedSetup.mode || DEFAULT_SETUP.mode,
    type: (session.interviewType ||
      session.type ||
      storedSetup.type) as ExtendedInterviewSetup["type"],
    difficulty: (session.difficulty ||
      storedSetup.difficulty) as ExtendedInterviewSetup["difficulty"],
    questionCount:
      session.questionCount || storedSetup.questionCount || DEFAULT_SETUP.questionCount,
  };
}

function normalizeStoredQuestions(value: unknown): Question[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((question, questionIndex) => {
      if (!question || typeof question !== "object") return null;

      const questionRecord = question as { id?: unknown; text?: unknown; question?: unknown };
      const text = String(questionRecord.text || questionRecord.question || "").trim();

      if (!text) return null;

      const numericId = Number(questionRecord.id);

      return {
        id: Number.isFinite(numericId) && numericId > 0 ? numericId : questionIndex + 1,
        text,
      };
    })
    .filter((question): question is Question => Boolean(question));
}

function mapSavedAnswerToHistoryItem(answer: SavedInterviewAnswer): AnswerWithFeedback {
  const scores = answer.scores || {};
  const feedback = answer.feedback || {
    overall: Number(scores.overall || 0),
    clarity: Number(scores.clarity || 0),
    relevance: Number(scores.relevance || 0),
    structure: Number(scores.structure || 0),
    technicalAccuracy: Number(scores.technicalAccuracy || 0),
    strengths: answer.strengths || [],
    weaknesses: answer.weaknesses || [],
    improvedAnswer: answer.improvedAnswer || "",
    summary: answer.summary || "",
    interviewTip: answer.interviewTip || "",
  };

  return {
    question: {
      id: answer.questionId,
      text: answer.questionText,
    },
    answer: answer.answerText,
    feedback,
  };
}

function getResumeIndex(
  questions: Question[],
  savedAnswers: SavedInterviewAnswer[],
  currentQuestionIndex?: number | null,
) {
  if (questions.length === 0) return 0;

  const answeredQuestionIds = new Set(savedAnswers.map((answer) => answer.questionId));
  const firstUnansweredIndex = questions.findIndex(
    (question) => !answeredQuestionIds.has(question.id),
  );

  if (firstUnansweredIndex >= 0) {
    return firstUnansweredIndex;
  }

  const storedIndex = Number(currentQuestionIndex || 0);

  if (Number.isFinite(storedIndex)) {
    return Math.min(Math.max(storedIndex, 0), questions.length - 1);
  }

  return Math.max(questions.length - 1, 0);
}

interface SpeechRecognitionResultLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal?: boolean;
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionErrorLike {
  error?: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionResultLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type WindowWithSpeechRecognition = Window &
  typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

function getModeLabel(mode?: InterviewModeLabel) {
  const normalized = String(mode || "Text").toLowerCase();

  if (normalized === "voice") return "Voice";
  if (normalized === "video") return "Video";

  return "Text";
}

function buildFallbackFinalReport(history: AnswerWithFeedback[]): FinalReport {
  const averageScore =
    history.length > 0
      ? Math.round(
          history.reduce((total, item) => total + Number(item.feedback.overall || 0), 0) /
            history.length,
        ) * 10
      : 55;

  return {
    overallScore: averageScore,
    breakdown: {
      clarity: 55,
      relevance: 55,
      structure: 50,
      confidence: 55,
      technicalAccuracy: 55,
    },
    strengths: [
      "You completed the interview practice.",
      "Your answers show a starting point for improvement.",
    ],
    improvements: [
      "Use more specific examples from your projects or experience.",
      "Structure your answers clearly using the STAR method.",
      "Explain your reasoning step by step for technical questions.",
    ],
    nextSteps: [
      "Prepare 3 project examples using the STAR method.",
      "Practice explaining technical answers clearly.",
      "Review weak answers and rewrite them.",
    ],
    improvedSampleAnswer:
      "A stronger answer should briefly explain the situation, describe your specific action, and clearly state the result or impact.",
  };
}

function buildFrontendFallbackFeedback(): Feedback {
  return {
    overall: 3,
    clarity: 3,
    relevance: 3,
    structure: 3,
    technicalAccuracy: 3,
    strengths: ["Fallback feedback was used because the answer feedback request failed."],
    weaknesses: [
      "Check whether the configured backend API is running.",
      "Check your selected AI provider and API key in server/.env.",
      "Check the backend terminal for the real API error.",
    ],
    improvedAnswer:
      "Fallback feedback is active. The AI provider or backend did not return a valid answer feedback response.",
    summary:
      "AI feedback failed, so the app used fallback feedback. Check your backend terminal logs.",
    interviewTip:
      "Make sure the backend is running and your AI_PROVIDER / API key are correctly configured.",
  };
}

function InterviewRoom() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const hasInitializedSession = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const shouldKeepListeningRef = useRef(false);
  const speechStartedAtRef = useRef<number | null>(null);
  const speechDurationMsRef = useRef(0);
  const cameraStartedAtRef = useRef<number | null>(null);
  const cameraDurationMsRef = useRef(0);
  const cameraWasStartedRef = useRef(false);

  const [sessionId, setSessionId] = useState("");
  const [sessionStatus, setSessionStatus] = useState<"in-progress" | "completed" | "cancelled">(
    "in-progress",
  );
  const [setup, setSetup] = useState<ExtendedInterviewSetup>(DEFAULT_SETUP);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [history, setHistory] = useState<AnswerWithFeedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [exitLoading, setExitLoading] = useState(false);

  const [questionError, setQuestionError] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [saveError, setSaveError] = useState("");

  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [liveVideoSignals, setLiveVideoSignals] = useState<VideoPresentationMetrics | null>(null);
  const [videoCalibrationComplete, setVideoCalibrationComplete] = useState(false);

  useEffect(() => {
    setVideoCalibrationComplete(false);
  }, [sessionId, setup.mode]);

  useEffect(() => {
    if (!user) return;
    hasInitializedSession.current = true;

    const initializeInterview = async () => {
      const activeSessionId =
        typeof window !== "undefined" ? localStorage.getItem("ir.sessionId") || "" : "";

      if (!activeSessionId) {
        navigate({ to: "/start" });
        return;
      }

      try {
        const session = await getInterviewSession(activeSessionId);

        if (!session) {
          localStorage.removeItem("ir.sessionId");
          localStorage.removeItem("ir.activeAttemptId");
          navigate({ to: "/start" });
          return;
        }

        if (session.status === "completed" || session.status === "cancelled") {
          localStorage.removeItem("ir.sessionId");
          localStorage.removeItem("ir.activeAttemptId");
          navigate({ to: "/dashboard" });
          return;
        }

        const selectedSetup = buildSetupFromSession(session, readStoredSetup());

        setSessionId(activeSessionId);
        setSessionStatus("in-progress");
        setSetup(selectedSetup);

        localStorage.setItem("ir.setup", JSON.stringify(selectedSetup));

        if (session.attemptId) {
          localStorage.setItem("ir.activeAttemptId", session.attemptId);
        }

        const savedAnswers = await getSessionAnswers({
          sessionId: activeSessionId,
          userId: user.uid,
        });

        const restoredHistory = savedAnswers.map(mapSavedAnswerToHistoryItem);

        setHistory(restoredHistory);

        let interviewQuestions = normalizeStoredQuestions(session.generatedQuestions);

        if (interviewQuestions.length === 0) {
          try {
            const result = await generateInterviewQuestions({
              role: selectedSetup.role,
              targetRole: selectedSetup.targetRole || "",
              type: selectedSetup.type,
              difficulty: selectedSetup.difficulty,
              questionCount: selectedSetup.questionCount,
              targetCompany: selectedSetup.targetCompany || "",
              jobDescription: selectedSetup.jobDescription || "",
              resumeSummary: selectedSetup.resumeSummary || "",
              resumeSkills: selectedSetup.resumeSkills || [],
              resumeProjects: selectedSetup.resumeProjects || [],
              resumeEducation: selectedSetup.resumeEducation || "",
              companyContext: selectedSetup.companyContext,
            });

            interviewQuestions = result.questions.map((question, questionIndex) => ({
              id: questionIndex + 1,
              text: question.text,
            }));
          } catch (error) {
            console.error("AI question generation failed:", error);

            setQuestionError("AI question generation failed, so fallback questions were loaded.");

            interviewQuestions = [
              {
                id: 1,
                text: `Tell me about yourself and why you are interested in the ${
                  selectedSetup.targetRole || selectedSetup.role
                } role.`,
              },
              {
                id: 2,
                text: `What skills make you suitable for this ${
                  selectedSetup.targetRole || selectedSetup.role
                } position?`,
              },
              {
                id: 3,
                text: "Describe one project or experience that shows your problem-solving ability.",
              },
            ];
          }

          try {
            await updateInterviewSessionQuestions({
              sessionId: activeSessionId,
              userId: user.uid,
              questions: interviewQuestions,
            });
          } catch (error) {
            console.error("Failed to save generated questions:", error);
            setSaveError("Interview questions loaded, but they were not saved to Supabase.");
          }
        }

        const resumeIndex = getResumeIndex(
          interviewQuestions,
          savedAnswers,
          session.currentQuestionIndex,
        );
        const restoredAnswer = restoredHistory.find(
          (item) => item.question.id === interviewQuestions[resumeIndex]?.id,
        );

        setQuestions(interviewQuestions);
        setIndex(resumeIndex);

        if (restoredAnswer && savedAnswers.length >= interviewQuestions.length) {
          setAnswer(restoredAnswer.answer);
          setFeedback(restoredAnswer.feedback);
        }
      } catch (error) {
        console.error("Failed to load interview session:", error);
        setQuestionError("Could not load your saved interview session. Please try again.");
      }
    };

    initializeInterview();
  }, [navigate, user]);

  useEffect(() => {
    return () => {
      shouldKeepListeningRef.current = false;
      recognitionRef.current?.stop();

      if (typeof window !== "undefined") {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (!sessionId || sessionStatus !== "in-progress") return undefined;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [sessionId, sessionStatus]);

  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <div className="rounded-3xl border border-border bg-card p-8 shadow-elegant">
          <Sparkles className="mx-auto h-8 w-8 text-primary" />
          <p className="mt-4 text-muted-foreground">Preparing your interview…</p>
        </div>
      </div>
    );
  }

  const current = questions[index];
  const isLast = index === questions.length - 1;
  const progress = Math.round(((index + 1) / questions.length) * 100);
  const modeLabel = getModeLabel(setup.mode);

  const wordCount = answer.trim() ? answer.trim().split(/\s+/).filter(Boolean).length : 0;
  const liveSpeechMetrics = calculateSpeechMetrics(answer, speechDurationMsRef.current);

  const finishSpeechSegment = () => {
    if (!speechStartedAtRef.current) return;

    speechDurationMsRef.current += Date.now() - speechStartedAtRef.current;
    speechStartedAtRef.current = null;
  };

  const getSpeechDurationMs = () =>
    speechDurationMsRef.current +
    (speechStartedAtRef.current ? Date.now() - speechStartedAtRef.current : 0);

  const finishCameraSegment = () => {
    if (!cameraStartedAtRef.current) return;

    cameraDurationMsRef.current += Date.now() - cameraStartedAtRef.current;
    cameraStartedAtRef.current = null;
  };

  const getCameraDurationMs = () =>
    cameraDurationMsRef.current +
    (cameraStartedAtRef.current ? Date.now() - cameraStartedAtRef.current : 0);

  const getFinalVisualMetrics = () => {
    const baseMetrics = calculateVisualMetrics({
      mode: modeLabel,
      cameraEnabledMs: getCameraDurationMs(),
      cameraWasStarted: cameraWasStartedRef.current || Boolean(cameraStream),
    });

    return mergeVisualMetrics(baseMetrics, liveVideoSignals || undefined);
  };

  const getActiveSessionId = () =>
    sessionId || (typeof window !== "undefined" ? localStorage.getItem("ir.sessionId") || "" : "");

  const persistProgress = async (currentQuestionIndex: number) => {
    const activeSessionId = getActiveSessionId();

    if (!user || !activeSessionId) return;

    try {
      await updateInterviewSessionProgress({
        sessionId: activeSessionId,
        userId: user.uid,
        currentQuestionIndex,
      });
    } catch (error) {
      console.error("Failed to save interview progress:", error);
      setSaveError("Your progress could not be saved to Supabase.");
    }
  };

  const saveHistoryItem = (savedAnswer: AnswerWithFeedback) => {
    setHistory((previousHistory) => {
      const existingIndex = previousHistory.findIndex(
        (item) => item.question.id === savedAnswer.question.id,
      );

      if (existingIndex < 0) {
        return [...previousHistory, savedAnswer];
      }

      return previousHistory.map((item, itemIndex) =>
        itemIndex === existingIndex ? savedAnswer : item,
      );
    });
  };

  const persistSubmittedAnswer = async (fb: Feedback) => {
    const savedAnswer: AnswerWithFeedback = {
      question: current,
      answer,
      feedback: fb,
    };

    saveHistoryItem(savedAnswer);

    const activeSessionId = getActiveSessionId();

    if (!user || !activeSessionId) return;

    try {
      await saveInterviewAnswer({
        sessionId: activeSessionId,
        userId: user.uid,
        question: current,
        answer,
        feedback: fb,
      });

      await persistProgress(Math.min(index + 1, questions.length));
    } catch (error) {
      console.error("Failed to save answer to Supabase:", error);
      setSaveError("Your answer was analyzed, but it was not saved to Supabase.");
    }
  };

  const handleSubmit = async () => {
    if (!answer.trim() || feedback) return;

    setLoading(true);
    setFeedbackError("");
    setSaveError("");

    try {
      const fb = await analyzeInterviewAnswer({
        question: current.text,
        answer,
        role: setup.role,
        targetRole: setup.targetRole || "",
        type: setup.type,
        difficulty: setup.difficulty,
        targetCompany: setup.targetCompany || "",
        jobDescription: setup.jobDescription || "",
        resumeSummary: setup.resumeSummary || "",
        resumeSkills: setup.resumeSkills || [],
        resumeProjects: setup.resumeProjects || [],
        resumeEducation: setup.resumeEducation || "",
      });

      setFeedback(fb);
      await persistSubmittedAnswer(fb);
    } catch (error) {
      console.error("AI answer feedback failed:", error);

      setFeedbackError("AI answer feedback failed, so fallback feedback was loaded.");

      const fallbackFeedback = buildFrontendFallbackFeedback();

      setFeedback(fallbackFeedback);
      await persistSubmittedAnswer(fallbackFeedback);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setFeedback(null);
    setFeedbackError("");
    setSaveError("");
    setAnswer("");
    setIndex((currentIndex) => currentIndex + 1);
  };

  const handleSkip = async () => {
    if (isLast || feedback) return;

    setFeedback(null);
    setFeedbackError("");
    setSaveError("");
    setAnswer("");
    await persistProgress(Math.min(index + 1, questions.length));
    setIndex((currentIndex) => currentIndex + 1);
  };

  const handleBackQuestion = () => {
    shouldKeepListeningRef.current = false;
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimTranscript("");
    setVoiceError("");

    if (typeof window !== "undefined") {
      window.speechSynthesis.cancel();
    }

    setFeedback(null);
    setFeedbackError("");
    setSaveError("");
    setAnswer("");

    if (index > 0) {
      setIndex((currentIndex) => Math.max(0, currentIndex - 1));
      return;
    }

    setShowExitDialog(true);
  };

  const handlePrevious = async () => {
    if (index === 0 || feedback) return;

    setFeedback(null);
    setFeedbackError("");
    setSaveError("");
    setAnswer("");
    await persistProgress(Math.max(0, index - 1));
    setIndex((currentIndex) => Math.max(0, currentIndex - 1));
  };

  const handleFinish = async () => {
    setFinalizing(true);
    setSaveError("");

    const alreadySaved = history.some(
      (item) => item.question.id === current.id && item.answer === answer,
    );

    const finalHistory =
      feedback && !alreadySaved
        ? [
            ...history,
            {
              question: current,
              answer,
              feedback,
            },
          ]
        : history;

    const activeSessionId =
      sessionId ||
      (typeof window !== "undefined" ? localStorage.getItem("ir.sessionId") || "" : "");

    let report: FinalReport;

    try {
      const baseReport = await generateFinalReport({
        answers: finalHistory,
        role: setup.role,
        targetRole: setup.targetRole || "",
        type: setup.type,
        difficulty: setup.difficulty,
        targetCompany: setup.targetCompany || "",
        jobDescription: setup.jobDescription || "",
        resumeSummary: setup.resumeSummary || "",
        resumeSkills: setup.resumeSkills || [],
        resumeProjects: setup.resumeProjects || [],
        resumeEducation: setup.resumeEducation || "",
      });

      const speechMetrics = calculateSpeechMetrics(
        finalHistory.map((item) => item.answer).join(" "),
        getSpeechDurationMs(),
      );
      const visualMetrics = getFinalVisualMetrics();

      report = enrichFinalReport({
        baseReport,
        setup,
        history: finalHistory,
        speechMetrics,
        visualMetrics,
      });
    } catch (error) {
      console.error("AI final report failed:", error);
      const speechMetrics = calculateSpeechMetrics(
        finalHistory.map((item) => item.answer).join(" "),
        getSpeechDurationMs(),
      );
      const visualMetrics = getFinalVisualMetrics();

      report = enrichFinalReport({
        baseReport: buildFallbackFinalReport(finalHistory),
        setup,
        history: finalHistory,
        speechMetrics,
        visualMetrics,
      });
      setSaveError("AI final report failed, so a fallback final report was created.");
    }

    localStorage.setItem("ir.report", JSON.stringify(report));
    localStorage.setItem(
      "ir.session",
      JSON.stringify({
        setup,
        sessionId: activeSessionId,
        history: finalHistory,
      }),
    );

    if (user && activeSessionId) {
      try {
        try {
          await Promise.all([
            report.speechMetrics
              ? saveSpeechMetrics({
                  sessionId: activeSessionId,
                  userId: user.uid,
                  metrics: report.speechMetrics,
                })
              : Promise.resolve(""),
            report.visualMetrics
              ? saveVisualMetrics({
                  sessionId: activeSessionId,
                  userId: user.uid,
                  metrics: report.visualMetrics,
                })
              : Promise.resolve(""),
          ]);
        } catch (metricsError) {
          console.error("Failed to save multimodal metrics:", metricsError);
          setSaveError("Final report was created, but some multimodal metrics were not saved.");
        }

        await completeInterviewSession({
          sessionId: activeSessionId,
          userId: user.uid,
          overallScore: report.overallScore,
          finalReport: report,
        });
        setSessionStatus("completed");
      } catch (error) {
        console.error("Failed to complete Supabase session:", error);
        setSaveError(
          "Final report was created, but the Supabase session was not marked as completed.",
        );
      }
    }

    localStorage.removeItem("ir.sessionId");
    localStorage.removeItem("ir.activeAttemptId");

    navigate({ to: "/result" });
  };

  const handleContinueLater = async () => {
    const activeSessionId = getActiveSessionId();

    setExitLoading(true);
    setSaveError("");

    if (activeSessionId) {
      localStorage.setItem("ir.sessionId", activeSessionId);
    }

    try {
      await persistProgress(index);
      navigate({ to: "/dashboard" });
    } finally {
      setExitLoading(false);
    }
  };

  const handleCancelSession = async () => {
    const activeSessionId = getActiveSessionId();

    setExitLoading(true);
    setSaveError("");

    try {
      if (user && activeSessionId) {
        await cancelInterviewSession({
          sessionId: activeSessionId,
          userId: user.uid,
        });
      }

      setSessionStatus("cancelled");
      localStorage.removeItem("ir.sessionId");
      localStorage.removeItem("ir.activeAttemptId");
      navigate({ to: "/dashboard" });
    } catch (error) {
      console.error("Failed to cancel Supabase session:", error);
      setSaveError("Could not cancel the session. Please try again.");
      setExitLoading(false);
    }
  };

  const startVoiceInput = () => {
    setVoiceError("");
    setInterimTranscript("");

    const speechWindow = window as WindowWithSpeechRecognition;
    const SpeechRecognition =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      shouldKeepListeningRef.current = false;
      setVoiceError("Speech recognition is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    shouldKeepListeningRef.current = true;

    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      speechStartedAtRef.current ??= Date.now();
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interim = "";

      for (
        let resultIndex = event.resultIndex;
        resultIndex < event.results.length;
        resultIndex += 1
      ) {
        const result = event.results[resultIndex];
        const transcript = result?.[0]?.transcript || "";

        if (result?.isFinal) {
          finalTranscript = `${finalTranscript} ${transcript}`.trim();
        } else {
          interim = `${interim} ${transcript}`.trim();
        }
      }

      if (finalTranscript) {
        setAnswer((previousAnswer) => `${previousAnswer} ${finalTranscript}`.trim());
      }

      setInterimTranscript(interim);
    };

    recognition.onerror = (event) => {
      if (event.error === "aborted" && !shouldKeepListeningRef.current) {
        return;
      }

      if (
        shouldKeepListeningRef.current &&
        (event.error === "no-speech" || event.error === "aborted")
      ) {
        return;
      }

      shouldKeepListeningRef.current = false;
      finishSpeechSegment();
      setInterimTranscript("");
      setVoiceError(
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "Microphone permission was blocked. Please allow microphone access and try again."
          : "Could not capture your voice. Please try again.",
      );
      setIsListening(false);
    };

    recognition.onend = () => {
      finishSpeechSegment();

      if (shouldKeepListeningRef.current) {
        window.setTimeout(() => {
          if (!shouldKeepListeningRef.current) return;

          try {
            recognition.start();
          } catch (error) {
            console.warn("Speech recognition restart failed:", error);
            shouldKeepListeningRef.current = false;
            setIsListening(false);
            setVoiceError("Speech recognition stopped. Please start voice answer again.");
          }
        }, 250);

        return;
      }

      setInterimTranscript("");
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (error) {
      console.warn("Speech recognition start failed:", error);
      shouldKeepListeningRef.current = false;
      setIsListening(false);
      setVoiceError("Speech recognition could not start. Please try again.");
    }
  };

  const stopVoiceInput = () => {
    shouldKeepListeningRef.current = false;
    recognitionRef.current?.stop();
    finishSpeechSegment();
    setInterimTranscript("");
    setIsListening(false);
  };

  const speakCurrentQuestion = () => {
    if (!current?.text) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(current.text);
    utterance.lang = "en-US";
    utterance.rate = 0.95;
    utterance.pitch = 1;

    window.speechSynthesis.speak(utterance);
  };

  const handleCalibrationStreamReady = (stream: MediaStream | null) => {
    if (stream) {
      setCameraStream(stream);
      cameraWasStartedRef.current = true;

      if (!cameraStartedAtRef.current) {
        cameraStartedAtRef.current = Date.now();
      }

      return;
    }

    finishCameraSegment();
    setCameraStream(null);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
      {modeLabel === "Video" && (
        <VideoReadinessCalibration
          interviewStarted={videoCalibrationComplete}
          onComplete={() => setVideoCalibrationComplete(true)}
          onBack={() => navigate({ to: "/start" })}
          onStreamReady={handleCalibrationStreamReady}
          onMetricsUpdate={setLiveVideoSignals}
        />
      )}

      {questionError && (
        <div className="mb-4 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
          {questionError}
        </div>
      )}

      {feedbackError && (
        <div className="mb-4 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
          {feedbackError}
        </div>
      )}

      {saveError && (
        <div className="mb-4 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
          {saveError}
        </div>
      )}

      {showExitDialog && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-elegant">
            <h2 className="font-display text-xl font-semibold">Leave interview?</h2>

            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              You have an unfinished interview session. What would you like to do?
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleContinueLater}
                disabled={exitLoading}
              >
                Continue Later
              </Button>

              <Button
                type="button"
                variant="destructive"
                onClick={handleCancelSession}
                disabled={exitLoading}
              >
                Cancel Session
              </Button>

              <Button type="button" onClick={() => setShowExitDialog(false)} disabled={exitLoading}>
                Stay in Interview
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-border bg-card/80 p-3 shadow-elegant backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1.5 px-3 py-1">
            <Building2 className="h-3.5 w-3.5" />
            {setup.targetCompany || "No company"}
          </Badge>

          <Badge variant="secondary" className="gap-1.5 px-3 py-1">
            <Briefcase className="h-3.5 w-3.5" />
            {setup.targetRole || setup.role}
          </Badge>

          <Badge variant="secondary" className="px-3 py-1">
            {setup.type}
          </Badge>

          <Badge variant="outline" className="px-3 py-1.5">
            {setup.difficulty}
          </Badge>

          <Badge variant="outline" className="px-3 py-1.5">
            {modeLabel}
          </Badge>

          {setup.resume?.fileName && (
            <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
              <FileText className="h-3.5 w-3.5" />
              {setup.resume.fileName}
            </Badge>
          )}

          {sessionId && (
            <Badge variant="outline" className="px-3 py-1.5">
              Saved session
            </Badge>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => setShowExitDialog(true)}
          className="border-primary/40 text-primary hover:bg-primary/10"
        >
          Exit to Dashboard
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_380px]">
        <main className="space-y-6">
          <section className="rounded-3xl border border-border bg-card p-5 shadow-elegant sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleBackQuestion}
                  className="h-9 w-9 rounded-full"
                  aria-label={index > 0 ? "Back to previous question" : "Back to interview setup"}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>

                <p className="text-sm font-medium text-muted-foreground">
                  Question <span className="text-foreground">{index + 1}</span> of{" "}
                  {questions.length}
                </p>
              </div>

              <p className="text-sm font-medium text-muted-foreground">{progress}%</p>
            </div>

            <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary-gradient transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            <h1 className="max-w-4xl font-display text-lg font-bold leading-relaxed text-foreground sm:text-xl xl:text-2xl">
              {current.text}
            </h1>

            {modeLabel === "Text" && (
              <div className="mt-5 rounded-2xl border border-border bg-muted/30 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                      <FileText className="h-4 w-4 text-primary" />
                      Text mode
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Type your answer manually. You can also listen to the question before
                      answering.
                    </p>
                  </div>

                  <Button type="button" variant="outline" onClick={speakCurrentQuestion}>
                    <Volume2 className="mr-2 h-4 w-4" />
                    Read Question
                  </Button>
                </div>
              </div>
            )}

            {modeLabel === "Voice" && (
              <div className="mt-5 rounded-2xl border border-border bg-primary/5 p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Mic className="h-4 w-4" />
                  Voice mode
                </h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  Use your microphone to answer the question. Your speech will be converted into
                  text inside the answer box below.
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Button type="button" variant="outline" onClick={speakCurrentQuestion}>
                    <Volume2 className="mr-2 h-4 w-4" />
                    Read Question
                  </Button>

                  {!isListening ? (
                    <Button
                      type="button"
                      onClick={startVoiceInput}
                      className="bg-primary-gradient text-primary-foreground shadow-elegant hover:opacity-90"
                    >
                      <Mic className="mr-2 h-4 w-4" />
                      Start Speaking
                    </Button>
                  ) : (
                    <Button type="button" variant="destructive" onClick={stopVoiceInput}>
                      <MicOff className="mr-2 h-4 w-4" />
                      Stop Listening
                    </Button>
                  )}
                </div>

                {isListening && (
                  <div className="mt-4 rounded-xl border border-primary/20 bg-background p-4 text-sm text-primary">
                    Listening... speak your answer now. Your transcript will appear in the answer
                    box below.
                  </div>
                )}

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <SignalBox label="Pace" value={`${liveSpeechMetrics.wordsPerMinute} wpm`} />
                  <SignalBox label="Filler words" value={liveSpeechMetrics.fillerWordCount} />
                  <SignalBox
                    label="Speech clarity"
                    value={`${liveSpeechMetrics.speechClarityScore}%`}
                  />
                </div>

                {voiceError && <p className="mt-3 text-sm text-destructive">{voiceError}</p>}
              </div>
            )}

            {modeLabel === "Video" && (
              <div className="mt-5 rounded-2xl border border-border bg-primary/5 p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Video className="h-4 w-4" />
                  Video interview tools
                </h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  Video mode uses the setup camera for presentation signals. Numerical video scores
                  appear only in the final report.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <Button type="button" variant="outline" onClick={speakCurrentQuestion}>
                    <Volume2 className="mr-2 h-4 w-4" />
                    Read Question
                  </Button>

                  <div className="flex items-center justify-center rounded-2xl border border-primary/20 bg-background/80 px-4 py-2 text-sm font-medium text-primary">
                    <Video className="mr-2 h-4 w-4" />
                    {cameraStream ? "Camera ready from setup" : "Camera paused"}
                  </div>

                  <div className="flex items-center justify-center rounded-2xl border border-primary/20 bg-background/80 px-4 py-2 text-sm font-medium text-primary">
                    <Sparkles className="mr-2 h-4 w-4" />
                    {cameraStream ? "Presentation signals active" : "Presentation signals paused"}
                  </div>
                </div>

                <div className="mt-4">
                  {!isListening ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={startVoiceInput}
                      className="w-full justify-start rounded-2xl p-6"
                    >
                      <Mic className="mr-3 h-5 w-5 text-primary" />
                      <span className="text-left">
                        <span className="block font-semibold">Start Voice Answer</span>
                        <span className="text-xs text-muted-foreground">
                          Keep speaking or pause naturally. Stop when you are done.
                        </span>
                      </span>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={stopVoiceInput}
                      className="w-full justify-start rounded-2xl p-6"
                    >
                      <MicOff className="mr-3 h-5 w-5" />
                      <span className="text-left">
                        <span className="block font-semibold">Stop Voice</span>
                        <span className="text-xs">Listening to your answer</span>
                      </span>
                    </Button>
                  )}
                </div>

                {interimTranscript && isListening && (
                  <div className="mt-3 rounded-xl border border-primary/20 bg-background px-4 py-3 text-sm text-muted-foreground">
                    {interimTranscript}
                  </div>
                )}

                {voiceError && <p className="mt-3 text-sm text-destructive">{voiceError}</p>}
              </div>
            )}

            <div className="mt-6 border-t border-border pt-5">
              <label className="text-sm font-semibold text-foreground">Your Answer</label>

              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={!!feedback}
                placeholder="Type your answer here..."
                className="mt-3 min-h-32 w-full resize-y rounded-2xl border border-input bg-background px-4 py-3 text-sm leading-relaxed outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70 sm:min-h-36 xl:min-h-40"
              />

              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{wordCount} words</span>
                {feedback && <span>Answer submitted</span>}
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={index === 0 || !!feedback}
                >
                  Previous Question
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSkip}
                  disabled={isLast || !!feedback}
                >
                  Skip Question
                </Button>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                {!feedback && (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading || !answer.trim()}
                    className="bg-primary-gradient text-primary-foreground shadow-elegant hover:opacity-90"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {loading ? "Checking answer..." : "Submit Answer"}
                  </Button>
                )}

                {feedback &&
                  (isLast ? (
                    <Button
                      type="button"
                      onClick={handleFinish}
                      disabled={finalizing}
                      className="bg-primary-gradient text-primary-foreground shadow-elegant hover:opacity-90"
                    >
                      <Trophy className="mr-2 h-4 w-4" />
                      {finalizing ? "Building report..." : "View Final Report"}
                    </Button>
                  ) : (
                    <Button type="button" onClick={handleNext}>
                      Next Question
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ))}
              </div>
            </div>
          </section>

          {feedback && (
            <section className="rounded-3xl border border-border bg-card p-6 shadow-elegant">
              <FeedbackCard feedback={feedback} />
            </section>
          )}
        </main>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-border bg-card p-4 shadow-elegant">
            <h3 className="text-sm font-semibold">Session Progress</h3>

            <div className="mt-3 space-y-1.5">
              {questions.map((q, i) => (
                <div
                  key={q.id}
                  className={`flex gap-3 rounded-2xl px-3 py-2 text-sm transition ${
                    i === index
                      ? "bg-accent text-accent-foreground"
                      : i < index
                        ? "text-muted-foreground"
                        : "text-muted-foreground/70"
                  }`}
                >
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                      i < index
                        ? "bg-primary text-primary-foreground"
                        : i === index
                          ? "bg-primary-gradient text-primary-foreground"
                          : "bg-muted"
                    }`}
                  >
                    {i < index ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </span>

                  <span className="line-clamp-2 leading-relaxed">{q.text}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-5 shadow-elegant">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Lightbulb className="h-4 w-4" />
              Quick Tips
            </div>

            <ul className="mt-4 space-y-2 text-sm leading-relaxed text-muted-foreground">
              {TIPS.map((tip) => (
                <li key={tip}>• {tip}</li>
              ))}
            </ul>
          </section>

          <section className="rounded-3xl border border-border bg-card p-5 shadow-elegant">
            <h3 className="text-sm font-semibold text-primary">Interview Context</h3>

            <div className="mt-4 space-y-3 text-sm">
              <ContextRow label="Company" value={setup.targetCompany || "No company selected"} />
              <ContextRow label="Role" value={setup.targetRole || setup.role} />
              <ContextRow label="Interview Type" value={setup.type} />
              <ContextRow label="Difficulty" value={setup.difficulty} />
              <ContextRow label="Mode" value={modeLabel} />
              <ContextRow label="Resume" value={setup.resume?.fileName || "No resume selected"} />
              <ContextRow
                label="Company Research"
                value={setup.companyContext ? setup.companyContext.source : "Not loaded"}
              />
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-5 shadow-elegant">
            <h3 className="text-sm font-semibold text-primary">Live Signals</h3>

            <div className="mt-4 space-y-3 text-sm">
              <ContextRow
                label="Speech"
                value={
                  modeLabel === "Text"
                    ? "Not captured"
                    : `${liveSpeechMetrics.speechClarityScore}% clarity`
                }
              />
              <ContextRow
                label="Pace"
                value={
                  modeLabel === "Text" ? "Not captured" : `${liveSpeechMetrics.wordsPerMinute} wpm`
                }
              />
              <ContextRow
                label="Camera"
                value={
                  modeLabel === "Video"
                    ? cameraStream
                      ? "Camera ready from setup"
                      : "Camera paused"
                    : "Not required"
                }
              />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function SignalBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-lg font-semibold">{value}</p>
    </div>
  );
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3">
      <span className="font-medium text-foreground">{label}:</span>
      <span className="text-muted-foreground">{value}</span>
    </div>
  );
}
