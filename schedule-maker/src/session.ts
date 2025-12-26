// session.ts
import axios from "axios";

const SESSION_KEY = "schedule_maker_session_id";

export async function ensureSessionId(): Promise<string> {
  const existing = localStorage.getItem(SESSION_KEY);
  if (existing) return existing;

  const res = await axios.post("/api/usage/session");
  const sessionId = res.data.sessionId as string;
  localStorage.setItem(SESSION_KEY, sessionId);
  return sessionId;
}

export function getSessionId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}
