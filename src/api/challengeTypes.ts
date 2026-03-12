export type Submission = {
  submissionId: string;
  timeTaken: number;
  points?: number;
  score?: number;
  userCode: string;
};

export type ChallengeProblemMetadata = {
  problemId: string;
  score: number;
  timeTaken: number;
  completedAt: number;
};

export type ParticipantMetadata = {
  problemsDone: Record<string, ChallengeProblemMetadata>;
  problemsAttempted: number;
  totalScore: number;
  joinTime: number;
  lastConnected: number;
  initialJoinIp?: string;
  status?: string;
};

export type LeaderboardEntry = {
  userId: string;
  problemsCompleted: number;
  totalScore: number;
  rank: number;
};

export type ChallengeConfig = {
  maxUsers: number;
  maxEasyQuestions: number;
  maxMediumQuestions: number;
  maxHardQuestions: number;
};

export type ChallengeStatus =
  | "CHALLENGEOPEN"
  | "CHALLENGESTARTED"
  | "CHALLENGEFORFIETED"
  | "CHALLENGEENDED"
  | "CHALLENGEABANDON";

export type ChallengeDocument = {
  challengeId: string;
  creatorId: string;
  createdAt?: number;
  title: string;
  isPrivate: boolean;
  password?: string;
  status: ChallengeStatus | string;
  timeLimit: number;
  startTime: number;
  participants: Record<string, ParticipantMetadata>;
  submissions: Record<string, Record<string, Submission>>;
  leaderboard: LeaderboardEntry[];
  config?: ChallengeConfig;
  processedProblemIds: string[];
  problemCount?: number;
};
