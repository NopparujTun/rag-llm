// ─── Navigation ───────────────────────────────────────────────────────────────

export type Screen =
  | "home"
  | "practice"
  | "ai"
  | "insights"
  | "library"
  | "profile"
  | "session-results";

export interface NavigationParams {
  sessionId?: string;
  [key: string]: any;
}

// ─── Flashcards ───────────────────────────────────────────────────────────────

export interface FlashcardData {
  id: string;
  question: string;
  answer: string;
  skills: string[];
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export interface SessionData {
  id: string;
  /** Optional user-defined display name. Falls back to type-based label when absent. */
  name?: string;
  /** Session origin — either a resume upload or a job description paste. */
  type: "Resume" | "Job Description";
  date: string;
  cardCount: number;
  accuracy: number;
}

// ─── Practice Results ─────────────────────────────────────────────────────────

export interface SessionResult {
  cardId: string;
  action: "known" | "review";
}
