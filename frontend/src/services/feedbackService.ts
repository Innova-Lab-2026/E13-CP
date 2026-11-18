import { apiRequest } from "./api";

/** Largos que acepta POST /api/feedback (en caracteres, ya recortado). */
export const FEEDBACK_MIN_LENGTH = 3;
export const FEEDBACK_MAX_LENGTH = 1000;

export type FeedbackItem = {
  id: string;
  text: string;
  createdAt: string;
};

/** "Ayudanos a mejorar": envía la opinión del adulto al equipo. */
export async function sendFeedback(text: string): Promise<FeedbackItem> {
  const data = await apiRequest<{ feedback: FeedbackItem }>("/api/feedback", {
    method: "POST",
    body: { text },
  });
  return data.feedback;
}
