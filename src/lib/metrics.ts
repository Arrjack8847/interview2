import type {
  AnswerWithFeedback,
  FinalReport,
  InterviewSetup,
  SpeechMetrics,
  VisualMetrics,
} from "@/lib/types";

type InterviewSetupLike = Partial<Omit<InterviewSetup, "mode">> & {
  mode?: string;
};

const FILLER_PATTERNS = [
  /\bum+\b/gi,
  /\buh+\b/gi,
  /\ber+\b/gi,
  /\bah+\b/gi,
  /\blike\b/gi,
  /\byou know\b/gi,
  /\bbasically\b/gi,
  /\bactually\b/gi,
  /\bsort of\b/gi,
  /\bkind of\b/gi,
];

export function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.round(value), 0), 100);
}

export function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

function average(values: number[]) {
  const validValues = values.filter((value) => Number.isFinite(value));

  if (validValues.length === 0) return 0;

  return validValues.reduce((total, value) => total + value, 0) / validValues.length;
}

function calculateModeAwareOverallScore({
  mode,
  answerQualityScore,
  communicationScore,
  resumeMatchScore,
  companyReadinessScore,
  speechConfidenceScore,
  videoPresentationScore,
  hasReliableSpeech,
  hasReliableVideo,
}: {
  mode?: string;
  answerQualityScore: number;
  communicationScore: number;
  resumeMatchScore: number;
  companyReadinessScore: number;
  speechConfidenceScore: number;
  videoPresentationScore: number;
  hasReliableSpeech: boolean;
  hasReliableVideo: boolean;
}) {
  const normalizedMode = String(mode || "text").toLowerCase();

  const answer = clampScore(answerQualityScore);
  const communication = clampScore(communicationScore);
  const resume = clampScore(resumeMatchScore);
  const company = clampScore(companyReadinessScore);
  const speech = clampScore(speechConfidenceScore);
  const video = clampScore(videoPresentationScore);

  if (normalizedMode === "video" && hasReliableVideo && video > 0) {
    return clampScore(
      answer * 0.45 + communication * 0.2 + resume * 0.1 + company * 0.1 + video * 0.15,
    );
  }

  if (normalizedMode === "voice" && hasReliableSpeech && speech > 0) {
    return clampScore(
      answer * 0.5 + communication * 0.25 + resume * 0.1 + company * 0.1 + speech * 0.05,
    );
  }

  return clampScore(answer * 0.6 + communication * 0.2 + resume * 0.1 + company * 0.1);
}

export function calculateSpeechMetrics(text: string, durationMs: number): SpeechMetrics {
  const spokenWordCount = countWords(text);
  const durationSeconds = Math.max(Math.round(durationMs / 1000), 0);
  const durationMinutes = durationSeconds > 0 ? durationSeconds / 60 : 0;
  const wordsPerMinute = durationMinutes > 0 ? Math.round(spokenWordCount / durationMinutes) : 0;

  const fillerWordCount = FILLER_PATTERNS.reduce((total, pattern) => {
    const matches = text.match(pattern);
    return total + (matches?.length || 0);
  }, 0);

  const expectedSeconds = spokenWordCount > 0 ? (spokenWordCount / 130) * 60 : 0;
  const pauseCount = Math.max(0, Math.round((durationSeconds - expectedSeconds) / 4));

  const paceScore =
    wordsPerMinute === 0 ? 0 : 100 - Math.min(Math.abs(wordsPerMinute - 130) * 0.8, 35);

  const fillerPenalty =
    spokenWordCount > 0 ? Math.min((fillerWordCount / spokenWordCount) * 260, 28) : 0;

  const pausePenalty = Math.min(pauseCount * 4, 24);

  return {
    spokenWordCount,
    fillerWordCount,
    pauseCount,
    wordsPerMinute,
    speakingPace: clampScore(paceScore),
    transcriptDurationSeconds: durationSeconds,
    speechClarityScore: clampScore(paceScore - fillerPenalty - pausePenalty),
  };
}

export function calculateVisualMetrics({
  mode,
  cameraEnabledMs,
  cameraWasStarted,
}: {
  mode: string;
  cameraEnabledMs: number;
  cameraWasStarted: boolean;
}): VisualMetrics {
  const isVideoMode = mode.toLowerCase() === "video";
  const cameraEnabledSeconds = Math.max(0, Math.round(cameraEnabledMs / 1000));

  const cameraPresenceScore =
    isVideoMode && cameraWasStarted ? clampScore(55 + Math.min(cameraEnabledSeconds * 1.5, 45)) : 0;

  const visualSummary =
    isVideoMode && !cameraWasStarted
      ? ["Camera was not active long enough for video presentation analysis."]
      : isVideoMode
        ? [
            "Camera was active during video practice. Live presentation signal details may be available in the final report.",
          ]
        : undefined;

  return {
    cameraEnabledSeconds,
    faceVisiblePercentage: cameraWasStarted ? cameraPresenceScore : 0,
    lookingAwayCount: 0,
    headMovementScore: cameraWasStarted ? 85 : 0,
    cameraPresenceScore,
    faceVisibilityScore: isVideoMode && cameraWasStarted ? cameraPresenceScore : 0,
    faceCenteringScore: isVideoMode && cameraWasStarted ? cameraPresenceScore : 0,
    handVisibilityScore: 0,
    movementStabilityScore: isVideoMode && cameraWasStarted ? 85 : 0,
    overallPresentationScore: isVideoMode && cameraWasStarted ? cameraPresenceScore : 0,
    eyeContactScore: 0,
    analysisDurationMs: 0,
    frameCount: 0,
    faceDetectedFrames: 0,
    faceCenteredFrames: 0,
    handDetectedFrames: 0,
    stableFrames: 0,
    eyeContactFrames: 0,
    screenFacingFrames: 0,
    lookingAwayFrames: 0,
    validFaceFrames: 0,
    visualSummary,
  };
}

export function mergeVisualMetrics(
  baseMetrics: VisualMetrics,
  liveVideoMetrics?: Partial<VisualMetrics>,
): VisualMetrics {
  if (!liveVideoMetrics || !liveVideoMetrics.frameCount) {
    return baseMetrics;
  }

  const cameraPresenceScore =
    liveVideoMetrics.cameraPresenceScore ?? baseMetrics.cameraPresenceScore ?? 0;

  const faceVisibilityScore =
    liveVideoMetrics.faceVisibilityScore ?? baseMetrics.faceVisibilityScore ?? 0;

  const faceCenteringScore =
    liveVideoMetrics.faceCenteringScore ?? baseMetrics.faceCenteringScore ?? 0;

  const movementStabilityScore =
    liveVideoMetrics.movementStabilityScore ?? baseMetrics.movementStabilityScore ?? 0;

  const handVisibilityScore =
    liveVideoMetrics.handVisibilityScore ?? baseMetrics.handVisibilityScore ?? 0;

  const eyeContactScore = liveVideoMetrics.eyeContactScore ?? baseMetrics.eyeContactScore ?? 0;

  const analysisDurationMs =
    liveVideoMetrics.analysisDurationMs ?? baseMetrics.analysisDurationMs ?? 0;

  const videoReliable = analysisDurationMs >= 8000;

  const overallPresentationScore =
    liveVideoMetrics.overallPresentationScore ??
    (videoReliable
      ? clampScore(
          faceVisibilityScore * 0.25 +
            faceCenteringScore * 0.2 +
            eyeContactScore * 0.2 +
            movementStabilityScore * 0.2 +
            cameraPresenceScore * 0.15,
        )
      : 0);

  return {
    ...baseMetrics,
    cameraPresenceScore,
    faceVisiblePercentage: faceVisibilityScore,
    headMovementScore: movementStabilityScore,
    faceVisibilityScore,
    faceCenteringScore,
    handVisibilityScore,
    movementStabilityScore,
    overallPresentationScore,
    eyeContactScore,
    analysisDurationMs,
    frameCount: liveVideoMetrics.frameCount ?? baseMetrics.frameCount,
    faceDetectedFrames: liveVideoMetrics.faceDetectedFrames ?? baseMetrics.faceDetectedFrames,
    faceCenteredFrames: liveVideoMetrics.faceCenteredFrames ?? baseMetrics.faceCenteredFrames,
    handDetectedFrames: liveVideoMetrics.handDetectedFrames ?? baseMetrics.handDetectedFrames,
    stableFrames: liveVideoMetrics.stableFrames ?? baseMetrics.stableFrames,
    eyeContactFrames: liveVideoMetrics.eyeContactFrames ?? baseMetrics.eyeContactFrames,
    screenFacingFrames: liveVideoMetrics.screenFacingFrames ?? baseMetrics.screenFacingFrames,
    lookingAwayFrames: liveVideoMetrics.lookingAwayFrames ?? baseMetrics.lookingAwayFrames,
    validFaceFrames: liveVideoMetrics.validFaceFrames ?? baseMetrics.validFaceFrames,
    lookingAwayCount: liveVideoMetrics.lookingAwayFrames ?? baseMetrics.lookingAwayCount,
    visualSummary: liveVideoMetrics.visualSummary?.length
      ? liveVideoMetrics.visualSummary
      : baseMetrics.visualSummary,
  };
}

export function calculateResumeMatchScore(setup: InterviewSetupLike) {
  const skills = setup.resumeSkills || setup.resume?.skills || [];
  const projects = setup.resumeProjects || setup.resume?.projects || [];
  const hasSummary = Boolean(setup.resumeSummary || setup.resume?.summary);
  const hasEducation = Boolean(setup.resumeEducation || setup.resume?.education);
  const roleSpecific = Boolean(setup.targetRole && setup.targetRole !== setup.role);

  return clampScore(
    35 +
      Math.min(skills.length * 6, 30) +
      Math.min(projects.length * 8, 20) +
      (hasSummary ? 8 : 0) +
      (hasEducation ? 4 : 0) +
      (roleSpecific ? 3 : 0),
  );
}

export function calculateCompanyReadinessScore(
  setup: InterviewSetupLike,
  history: AnswerWithFeedback[],
) {
  const relevanceAverage = average(history.map((item) => item.feedback.relevance * 10));

  return clampScore(
    average([
      relevanceAverage,
      setup.targetCompany ? 80 : 48,
      setup.jobDescription ? 85 : 55,
      setup.targetRole ? 75 : 50,
    ]),
  );
}

export function calculateCommunicationScore(
  history: AnswerWithFeedback[],
  speechMetrics: SpeechMetrics,
) {
  const feedbackCommunication = average(
    history.flatMap((item) => [item.feedback.clarity * 10, item.feedback.structure * 10]),
  );

  return clampScore(
    average([
      feedbackCommunication,
      ...(speechMetrics.speechClarityScore > 0 ? [speechMetrics.speechClarityScore] : []),
    ]),
  );
}

export function enrichFinalReport({
  baseReport,
  setup,
  history,
  speechMetrics,
  visualMetrics,
}: {
  baseReport: FinalReport;
  setup: InterviewSetupLike;
  history: AnswerWithFeedback[];
  speechMetrics: SpeechMetrics;
  visualMetrics: VisualMetrics;
}): FinalReport {
  const mode = String(setup.mode || "text").toLowerCase();
  const isVideoMode = mode === "video";

  const resumeMatchScore = calculateResumeMatchScore(setup);
  const companyReadinessScore = calculateCompanyReadinessScore(setup, history);
  const communicationScore = calculateCommunicationScore(history, speechMetrics);

  const hasReliableSpeech =
    mode === "voice" || mode === "video"
      ? speechMetrics.transcriptDurationSeconds >= 8 && speechMetrics.speechClarityScore > 0
      : false;

  const speechConfidenceScore = hasReliableSpeech ? speechMetrics.speechClarityScore : 0;

  const hasReliableVideo =
    isVideoMode &&
    typeof visualMetrics.analysisDurationMs === "number" &&
    visualMetrics.analysisDurationMs >= 8000 &&
    typeof visualMetrics.frameCount === "number" &&
    visualMetrics.frameCount > 0;

  const cameraPresenceScore =
    isVideoMode && hasReliableVideo ? visualMetrics.cameraPresenceScore : 0;

  const overallPresentationScore =
    isVideoMode && hasReliableVideo ? visualMetrics.overallPresentationScore || 0 : 0;

  const overallScore = calculateModeAwareOverallScore({
    mode,
    answerQualityScore: baseReport.overallScore,
    communicationScore,
    resumeMatchScore,
    companyReadinessScore,
    speechConfidenceScore,
    videoPresentationScore: overallPresentationScore,
    hasReliableSpeech,
    hasReliableVideo,
  });

  const videoStrengths =
    isVideoMode && visualMetrics.visualSummary?.length
      ? visualMetrics.visualSummary.filter(
          (item) =>
            item.includes("consistent") ||
            item.includes("visible") ||
            item.includes("centering") ||
            item.includes("stability") ||
            item.includes("screen-facing"),
        )
      : [];

  const videoImprovements =
    isVideoMode && visualMetrics.visualSummary?.length
      ? visualMetrics.visualSummary.filter(
          (item) =>
            item.includes("limited") ||
            item.includes("Try") ||
            item.includes("varied") ||
            item.includes("direction") ||
            item.includes("not active") ||
            item.includes("Not enough"),
        )
      : [];

  const nextSteps = [
    ...(baseReport.nextSteps || []),
    setup.targetCompany
      ? `Prepare two examples that connect your experience to ${setup.targetCompany}.`
      : "Add a target company so future practice can measure company readiness.",
    mode === "text"
      ? "Try one answer in voice mode later to practice speaking pace and clarity."
      : "Repeat one answer out loud and aim for a steady 110-150 words per minute.",
    isVideoMode && !hasReliableVideo
      ? "Use video mode for at least 8 seconds so the system can capture reliable presentation signals."
      : "",
  ].filter(Boolean);

  const improvementPlan = [
    "Rewrite the weakest answer using Situation, Task, Action, Result.",
    "Add one measurable outcome to every project example.",
    mode === "text"
      ? "Practice a 60-90 second typed answer with clearer structure."
      : "Practice a 60-90 second answer out loud before the next session.",
  ];

  return {
    ...baseReport,
    overallScore,
    breakdown: {
      ...baseReport.breakdown,
      communication: communicationScore,
      resumeMatch: resumeMatchScore,
      companyReadiness: companyReadinessScore,
      speechConfidence: speechConfidenceScore,
      cameraPresence: cameraPresenceScore,
    },
    strengths: Array.from(
      new Set(
        [
          ...(baseReport.strengths || []),
          resumeMatchScore >= 70 ? "Your resume context supports the target role." : "",
          companyReadinessScore >= 70
            ? "Your answers are reasonably aligned to the target company."
            : "",
          ...videoStrengths,
        ].filter(Boolean),
      ),
    ),
    improvements: Array.from(
      new Set(
        [
          ...(baseReport.improvements || []),
          resumeMatchScore < 70 ? "Add more resume-specific examples to strengthen role fit." : "",
          companyReadinessScore < 70
            ? "Use the target company and job description more directly in your answers."
            : "",
          hasReliableSpeech && speechConfidenceScore < 70
            ? "Reduce filler words and keep answers at a steadier speaking pace."
            : "",
          isVideoMode && hasReliableVideo && overallPresentationScore < 70
            ? "Keep your camera active and your face clearly centered for stronger presentation feedback."
            : "",
          isVideoMode && !hasReliableVideo
            ? "Not enough video data was captured for a reliable video presentation score."
            : "",
          ...videoImprovements,
        ].filter(Boolean),
      ),
    ),
    nextSteps: Array.from(new Set(nextSteps)).slice(0, 6),
    improvementPlan,
    communicationScore,
    resumeMatchScore,
    companyReadinessScore,
    speechConfidenceScore,
    cameraPresenceScore,
    overallPresentationScore,
    speechMetrics,
    visualMetrics: isVideoMode ? visualMetrics : undefined,
    answerCount: history.length,
  };
}
