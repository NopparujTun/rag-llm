const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

// ─── Types ────────────────────────────────────────────────────────────────────

/** File payload accepted by the resume upload endpoint.
 *  On native (iOS/Android), provide `uri`, `name`, and `mimeType`.
 *  On Expo Web, the `file` field holds the native browser `File` object. */
export interface ResumeFileInput {
  uri: string;
  name: string;
  mimeType?: string;
  /** Browser `File` object present only on Expo Web. */
  file?: File;
}

// ─── Shared Helpers ───────────────────────────────────────────────────────────

/** Normalises a raw flashcard from the API, filling in missing optional fields. */
function normalizeFlashcard(card: any, index: number) {
  return {
    ...card,
    id: card.id || `temp_id_${Date.now()}_${index}`,
    difficulty: card.difficulty
      ? card.difficulty.charAt(0).toUpperCase() + card.difficulty.slice(1)
      : "Medium",
    category: card.category || "General",
  };
}

/** Normalises a generation response, mapping snake_case fields and
 *  normalising every flashcard in the payload. */
function normalizeGenerationResponse(data: any) {
  const flashcards = (data.flashcards || []).map(normalizeFlashcard);
  return {
    ...data,
    sessionId: data.session_id || data.id || `session_${Date.now()}`,
    flashcards,
  };
}

// ─── API Client ───────────────────────────────────────────────────────────────

export const api = {
  /**
   * Uploads a PDF resume and generates flashcards from the extracted text.
   * Sends a `multipart/form-data` request — do NOT set Content-Type manually.
   */
  generateFromResume: async (
    file: ResumeFileInput,
    role?: string,
    level?: string,
    userId?: string,
  ) => {
    const formData = new FormData();

    // On Expo Web, `file.file` is a native browser File object and must be
    // appended directly. On native, we use the {uri, name, type} object shape
    // that React Native's polyfilled fetch understands.
    if (file.file) {
      formData.append("file", file.file);
    } else {
      formData.append("file", {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || "application/pdf",
      } as any);
    }

    if (role) formData.append("role", role);
    if (level) formData.append("level", level);
    if (userId) formData.append("user_id", userId);

    const response = await fetch(`${API_BASE_URL}/generate-from-resume`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`(HTTP ${response.status}) ${errText}`);
    }

    const data = await response.json();

    if (data.status === "error" || !data.flashcards?.length) {
      throw new Error(
        data.message || "No flashcards generated. Please try again.",
      );
    }

    return normalizeGenerationResponse(data);
  },

  /**
   * Sends a job description text and generates flashcards from it.
   */
  generateFromJobs: async (jobDescription: string, userId?: string) => {
    const response = await fetch(`${API_BASE_URL}/generate-from-jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_descriptions: [jobDescription],
        user_id: userId,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate flashcards from job description");
    }

    const data = await response.json();

    if (data.status === "error" || !data.flashcards?.length) {
      throw new Error(
        data.message || "No flashcards generated. Please try again.",
      );
    }

    return normalizeGenerationResponse(data);
  },

  /** Fetches all flashcards belonging to a given session. */
  getSessionFlashcards: async (sessionId: string) => {
    const response = await fetch(
      `${API_BASE_URL}/sessions/${sessionId}/flashcards`,
    );
    if (!response.ok) {
      throw new Error("Failed to fetch session flashcards");
    }
    return response.json();
  },

  /** Updates the known/review status of a single flashcard. */
  updateFlashcardStatus: async (
    flashcardId: string,
    status: "known" | "review",
  ) => {
    const response = await fetch(
      `${API_BASE_URL}/flashcards/${flashcardId}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      },
    );
    if (!response.ok) {
      throw new Error("Failed to update flashcard status");
    }
    return response.json();
  },

  /** Fetches the full list of sessions for the current user. */
  getSessionsList: async () => {
    const response = await fetch(`${API_BASE_URL}/sessions`);
    if (!response.ok) {
      throw new Error("Failed to fetch sessions");
    }
    const data = await response.json();
    return data.sessions || [];
  },

  /** Updates the display name of a session. */
  updateSessionName: async (sessionId: string, newName: string) => {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    if (!response.ok) {
      throw new Error("Failed to update session name");
    }
    return response.json();
  },

  /** Permanently deletes a session and all its flashcards. */
  deleteSession: async (sessionId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to delete session");
    }
  },

  /**
   * Sends the current conversation history + card context to the AI chat
   * endpoint and returns the assistant's reply text.
   */
  chat: async (
    cardContext: string,
    messages: Array<{ role: "user" | "assistant"; content: string }>,
  ): Promise<string> => {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card_context: cardContext, messages }),
    });
    if (!response.ok) {
      throw new Error(`Chat request failed (HTTP ${response.status})`);
    }
    const data = await response.json();
    if (data.status === "error" || !data.reply) {
      throw new Error(data.message || "No reply received from AI.");
    }
    return data.reply as string;
  },
};
