import type {
  AnswerWithFeedback,
  DashboardStats,
  Feedback,
  FinalReport,
  InterviewSetup,
  InterviewType,
  JobRole,
  Question,
  SessionSummary,
} from "./types";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockUser = {
  name: "Student",
  email: "student@demo.com",
};

const INTERVIEW_TIPS = [
  "Use the STAR method: Situation, Task, Action, Result.",
  "Quantify your impact with concrete details when possible.",
  "Pause briefly before answering — it shows thoughtfulness.",
  "End answers with the result, not just the action.",
  "For technical questions, explain your thinking step by step.",
];

const QUESTION_BANK: Record<JobRole, string[]> = {
  "IT Support Intern": [
    "Tell me about yourself.",
    "Why do you want this internship?",
    "How would you troubleshoot a computer that cannot connect to Wi-Fi?",
    "What is DNS?",
    "Tell me about a project you worked on.",
    "How would you help a non-technical user reset their password?",
    "Explain the difference between RAM and storage.",
    "What steps would you take if a printer is offline?",
    "How do you prioritize multiple support tickets?",
    "Describe a time you learned a new technology quickly.",
  ],
  "Software Developer Intern": [
    "Tell me about yourself.",
    "Walk me through a project you're proud of.",
    "Explain the difference between an array and a linked list.",
    "What is the difference between HTTP and HTTPS?",
    "How do you debug code you did not write?",
    "Describe object-oriented programming in your own words.",
    "What is version control and why is it useful?",
    "How would you design a simple to-do app?",
    "Explain what an API is to a non-technical person.",
    "Tell me about a time you fixed a difficult bug.",
  ],
  "Network Administrator": [
    "Tell me about yourself.",
    "Explain the OSI model briefly.",
    "What is the difference between TCP and UDP?",
    "How would you troubleshoot a slow network?",
    "What is a subnet and why is it useful?",
    "Describe a VLAN and when you would use one.",
    "What is the difference between a switch and a router?",
    "How do you secure a wireless network?",
    "Explain DHCP and DNS.",
    "Tell me about a network issue you resolved.",
  ],
  "Cybersecurity Intern": [
    "Tell me about yourself.",
    "What is the CIA triad?",
    "Explain phishing and how to defend against it.",
    "What is the difference between symmetric and asymmetric encryption?",
    "How would you respond to a suspected data breach?",
    "What is multi-factor authentication?",
    "Describe a recent cybersecurity topic you found interesting.",
    "What is a firewall?",
    "Explain SQL injection in simple terms.",
    "Why do you want to work in cybersecurity?",
  ],
  "Customer Service Assistant": [
    "Tell me about yourself.",
    "How do you handle an angry customer?",
    "Describe a time you went above and beyond for a customer.",
    "How do you stay patient under pressure?",
    "What does great customer service mean to you?",
    "Tell me about a time you handled a complaint.",
    "How do you manage multiple tasks at once?",
    "Describe a time you worked in a team.",
    "Why do you want this role?",
    "How do you handle feedback?",
  ],
};

function getWordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function clampTen(score: number) {
  return Math.min(Math.max(Math.round(score), 0), 10);
}

function getSetupValues(
  setupOrRole: InterviewSetup | JobRole,
  type?: InterviewType,
  count?: number,
) {
  if (typeof setupOrRole === "string") {
    return {
      role: setupOrRole,
      targetRole: setupOrRole,
      targetCompany: "",
      type: type || "Technical Interview",
      questionCount: count || 5,
      resumeSkills: [] as string[],
      resumeProjects: [] as string[],
    };
  }

  return {
    role: setupOrRole.role,
    targetRole: setupOrRole.targetRole || setupOrRole.role,
    targetCompany: setupOrRole.targetCompany || "",
    type: setupOrRole.type,
    questionCount: setupOrRole.questionCount,
    resumeSkills: setupOrRole.resumeSkills || setupOrRole.resume?.skills || [],
    resumeProjects: setupOrRole.resumeProjects || setupOrRole.resume?.projects || [],
  };
}

export async function getMockQuestions(
  setupOrRole: InterviewSetup | JobRole,
  type?: InterviewType,
  count?: number,
): Promise<Question[]> {
  await delay(400);

  const setup = getSetupValues(setupOrRole, type, count);
  const pool = QUESTION_BANK[setup.role] ?? QUESTION_BANK["IT Support Intern"];

  const personalizedQuestions: string[] = [];

  if (setup.targetCompany) {
    personalizedQuestions.push(
      `Why are you interested in ${setup.targetCompany}, and how do your skills match the ${setup.targetRole} role?`,
    );
  }

  if (setup.resumeSkills.length > 0) {
    personalizedQuestions.push(
      `Your resume mentions ${setup.resumeSkills
        .slice(0, 3)
        .join(", ")}. Can you explain how you have used these skills?`,
    );
  }

  if (setup.resumeProjects.length > 0) {
    personalizedQuestions.push(
      `Walk me through your project "${setup.resumeProjects[0]}" and explain your role in it.`,
    );
  }

  const combinedQuestions = [...personalizedQuestions, ...pool];
  const uniqueQuestions = Array.from(new Set(combinedQuestions));

  return uniqueQuestions.slice(0, setup.questionCount).map((text, index) => ({
    id: index + 1,
    text,
  }));
}

export async function getMockFeedback(question: string, answer: string): Promise<Feedback> {
  await delay(500);

  const wordCount = getWordCount(answer);

  let overall = 3;
  let clarity = 3;
  let relevance = 3;
  let structure = 2;
  let technicalAccuracy = 3;

  if (wordCount >= 20) {
    overall = 5;
    clarity = 5;
    relevance = 5;
    structure = 4;
    technicalAccuracy = 5;
  }

  if (wordCount >= 50) {
    overall = 7;
    clarity = 7;
    relevance = 7;
    structure = 6;
    technicalAccuracy = 7;
  }

  if (wordCount >= 90) {
    overall = 8;
    clarity = 8;
    relevance = 8;
    structure = 8;
    technicalAccuracy = 8;
  }

  const lowerAnswer = answer.toLowerCase();

  if (
    lowerAnswer.includes("example") ||
    lowerAnswer.includes("project") ||
    lowerAnswer.includes("result") ||
    lowerAnswer.includes("because")
  ) {
    overall += 1;
    structure += 1;
  }

  if (wordCount < 10) {
    return {
      overall: 2,
      clarity: 3,
      relevance: 2,
      structure: 1,
      technicalAccuracy: 2,
      strengths: ["Your answer is short and direct."],
      weaknesses: [
        "The answer is too brief for an interview.",
        "Add steps, reasoning, and a specific example.",
        "Explain the result or impact of your action.",
      ],
      improvedAnswer:
        "A stronger answer should explain the situation, the action you would take, why you would take it, and the result you expect. For technical troubleshooting, start with basic checks, then move to diagnosis, testing, and escalation.",
      summary: "Your answer needs more detail and structure before it is interview-ready.",
      interviewTip: "Avoid one-line answers. Interviewers want to hear your thinking process.",
      source: "local-fallback",
    };
  }

  return {
    overall: clampTen(overall),
    clarity: clampTen(clarity),
    relevance: clampTen(relevance),
    structure: clampTen(structure),
    technicalAccuracy: clampTen(technicalAccuracy),
    strengths: [
      "Your answer attempts to address the question.",
      wordCount >= 50
        ? "You provided enough detail to evaluate your thinking."
        : "Your answer is understandable and relevant.",
    ],
    weaknesses: [
      "Use clearer structure such as STAR: Situation, Task, Action, Result.",
      "Add one specific example from your project, study, or experience.",
      "End with the result, impact, or lesson learned.",
    ],
    improvedAnswer: `A stronger answer to "${question}" would start with a clear situation, explain your specific action step by step, and finish with the result. Include one concrete example so the interviewer can understand your real ability.`,
    summary:
      "Your answer is relevant, but it can be stronger with clearer structure and more specific examples.",
    interviewTip: INTERVIEW_TIPS[Math.floor(Math.random() * INTERVIEW_TIPS.length)],
    source: "local-fallback",
  };
}

export async function getMockFinalReport(answers: AnswerWithFeedback[]): Promise<FinalReport> {
  await delay(500);

  const average =
    answers.length > 0
      ? Math.round(
          answers.reduce((total, item) => total + Number(item.feedback.overall || 0), 0) /
            answers.length,
        )
      : 5;

  const overallScore = clampTen(average) * 10;

  return {
    overallScore,
    breakdown: {
      clarity: Math.min(overallScore + 3, 100),
      relevance: Math.min(overallScore + 2, 100),
      structure: Math.max(overallScore - 8, 0),
      confidence: Math.max(overallScore - 3, 0),
      technicalAccuracy: overallScore,
    },
    strengths: [
      "You completed the practice session.",
      "Your answers show a starting point for interview preparation.",
      "You are building confidence through repeated practice.",
    ],
    improvements: [
      "Use the STAR method more consistently.",
      "Add concrete examples and project details.",
      "Explain your technical reasoning step by step.",
    ],
    nextSteps: [
      "Rewrite your weakest answer with more structure.",
      "Prepare 3 project examples before your next practice.",
      "Practice one voice or video answer to improve delivery comfort.",
    ],
    improvedSampleAnswer:
      "A stronger answer should briefly explain the situation, describe your specific action, and clearly state the result or impact.",
    summary:
      "This report was generated by local mock logic. Real AI reporting should come from the backend API.",
    answerCount: answers.length,
    source: "local-fallback",
  };
}

const MOCK_HISTORY: SessionSummary[] = [
  {
    id: "s1",
    role: "IT Support Intern",
    type: "Technical Interview",
    date: "2026-05-08",
    score: 82,
    status: "completed",
    targetCompany: "Demo Company",
    targetRole: "IT Support Intern",
    difficulty: "Beginner",
    mode: "Text",
  },
  {
    id: "s2",
    role: "Software Developer Intern",
    type: "HR Interview",
    date: "2026-05-05",
    score: 72,
    status: "completed",
    targetCompany: "Demo Company",
    targetRole: "Software Developer Intern",
    difficulty: "Intermediate",
    mode: "Text",
  },
  {
    id: "s3",
    role: "Network Administrator",
    type: "Technical Interview",
    date: "2026-05-02",
    score: 88,
    status: "completed",
    targetCompany: "Demo Company",
    targetRole: "Network Administrator",
    difficulty: "Advanced",
    mode: "Voice",
  },
];

export function getMockDashboardStats(): DashboardStats {
  return {
    totalSessions: 12,
    averageScore: 76,
    latestScore: 82,
    bestSkill: "Clarity",
    weakestSkill: "Technical Accuracy",
    resumeMatchScore: 78,
    companyReadinessScore: 74,
    speechConfidenceScore: 72,
    cameraPresenceScore: 68,
    recent: MOCK_HISTORY.slice(0, 3),
  };
}

export function getMockHistory(): SessionSummary[] {
  return MOCK_HISTORY;
}
