export type JobRole =
  | "IT Support Intern"
  | "Software Developer Intern"
  | "Network Administrator"
  | "Cybersecurity Intern"
  | "Customer Service Assistant";

export type InterviewType = "HR Interview" | "Technical Interview" | "Behavioral Interview";

export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export type InterviewMode = "Text" | "Voice" | "Video";

export type InterviewModeValue = "text" | "voice" | "video";

export interface ResumePreview {
  fileName: string;
  fileUrl?: string;
  fileSize?: number;
  uploadedAt?: string;

  skills: string[];
  projects: string[];
  targetRoles?: string[];

  summary?: string;
  education?: string;
}

export interface CompanyContext {
  companyName: string;
  targetRole: string;
  industry: string;
  companyOverview: string;
  roleExpectations: string[];
  companyChallenges: string[];
  scenarioQuestionAngles: string[];
  interviewFocusAreas: string[];
  sourceUrls: string[];
  source: "web-ai" | "web-fallback" | "fallback" | string;
  provider?: string;
  model?: string;
  warning?: string;
}

export interface InterviewSetup {
  role: JobRole;

  targetCompany: string;
  targetRole: string;
  jobDescription?: string;

  resumeId?: string;
  resume?: ResumePreview;

  resumeSummary?: string;
  resumeSkills?: string[];
  resumeProjects?: string[];
  resumeEducation?: string;
  companyContext?: CompanyContext;

  mode: InterviewMode;
  type: InterviewType;
  difficulty: Difficulty;
  questionCount: number;
}

export interface Question {
  id: number;
  text: string;
}

export interface Feedback {
  overall: number;
  clarity: number;
  relevance: number;
  structure: number;
  technicalAccuracy: number;

  strengths: string[];
  weaknesses: string[];

  improvedAnswer: string;
  summary: string;
  interviewTip: string;

  source?: "ai" | "fallback" | "local-fallback";
  warning?: string;
  provider?: string;
  model?: string;
}

export interface AnswerWithFeedback {
  question: Question;
  answer: string;
  feedback: Feedback;
}

export interface SpeechMetrics {
  spokenWordCount: number;
  fillerWordCount: number;
  pauseCount: number;
  wordsPerMinute: number;
  speakingPace: number;
  transcriptDurationSeconds: number;
  speechClarityScore: number;
}

export interface VisualMetrics {
  cameraEnabledSeconds: number;
  faceVisiblePercentage: number;
  lookingAwayCount: number;
  headMovementScore: number;
  cameraPresenceScore: number;
  faceVisibilityScore?: number;
  faceCenteringScore?: number;
  handVisibilityScore?: number;
  movementStabilityScore?: number;
  overallPresentationScore?: number;
  eyeContactScore?: number;
  analysisDurationMs?: number;
  frameCount?: number;
  faceDetectedFrames?: number;
  faceCenteredFrames?: number;
  handDetectedFrames?: number;
  stableFrames?: number;
  eyeContactFrames?: number;
  screenFacingFrames?: number;
  lookingAwayFrames?: number;
  validFaceFrames?: number;
  visualSummary?: string[];
}

export interface FinalReport {
  overallScore: number;

  breakdown: {
    clarity: number;
    relevance: number;
    structure: number;
    confidence: number;
    technicalAccuracy: number;
    communication?: number;
    resumeMatch?: number;
    companyReadiness?: number;
    speechConfidence?: number;
    cameraPresence?: number;
  };

  strengths: string[];
  improvements: string[];
  nextSteps: string[];

  improvedSampleAnswer: string;
  summary?: string;
  improvementPlan?: string[];

  communicationScore?: number;
  resumeMatchScore?: number;
  companyReadinessScore?: number;
  speechConfidenceScore?: number;
  cameraPresenceScore?: number;
  overallPresentationScore?: number;

  speechMetrics?: SpeechMetrics;
  visualMetrics?: VisualMetrics;

  answerCount?: number;
  source?: "ai" | "fallback" | "local-fallback";
  warning?: string;
  provider?: string;
  model?: string;
}

export interface SessionSummary {
  id: string;
  role: JobRole;
  type: InterviewType;
  date: string;
  score: number;

  status?: "in-progress" | "completed" | "cancelled";
  targetCompany?: string;
  targetRole?: string;
  difficulty?: Difficulty;
  mode?: InterviewMode | InterviewModeValue;
  overallPresentationScore?: number;
}

export interface DashboardStats {
  totalSessions: number;
  averageScore: number;
  latestScore: number;
  bestSkill: string;
  weakestSkill: string;
  resumeMatchScore: number;
  companyReadinessScore: number;
  speechConfidenceScore: number;
  cameraPresenceScore: number;
  overallPresentationScore: number;
  recent: SessionSummary[];
}
