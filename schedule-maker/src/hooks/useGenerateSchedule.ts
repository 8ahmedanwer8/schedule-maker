import { useEffect, useState } from "react";
import { api } from "../api"; // <-- use your interceptor axios client
import { ensureSessionId } from "../session"; // <-- creates/stores session once

export type CalendarEvent = {
  id: string;
  title: string;
  instructors: string[];
  location: string;
  start: Date;
  end: Date;
};

export type UsageInfo = {
  remainingFree: number;
  adCredits: number;
  usedCredit: boolean;
};

export type GenerateResult =
  | { ok: true; events: CalendarEvent[]; usage?: UsageInfo }
  | { ok: false; needsAd: true; message?: string; usage?: UsageInfo }
  | { ok: false; needsAd: false; message?: string };

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const parseTimeString = (time: string, modifier: string) => {
  let [hours, minutes] = time.split(":").map(Number);
  if (modifier === "PM" && hours < 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;
  return { hours, minutes };
};

// Anchors "Tuesday 5:30 PM" into the CURRENT week (Sunday-start)
const parseDayTime = (dayTimeString: string): Date => {
  const [day, time, modifier] = dayTimeString.split(" ", 3);
  const today = new Date();

  const dayMap: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const targetDayIndex = dayMap[day] ?? 0;
  const targetDate = new Date(startOfWeek);
  targetDate.setDate(startOfWeek.getDate() + targetDayIndex);

  const { hours, minutes } = parseTimeString(time, modifier);
  targetDate.setHours(hours, minutes, 0, 0);

  return targetDate;
};

const normalizeInstructors = (x: any): string[] => {
  if (Array.isArray(x)) return x.filter(Boolean).map(String);
  if (typeof x === "string") {
    const s = x.trim();
    if (!s || s === "undefined" || s === "null") return [];
    return s
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
};

export default function useGenerateSchedule() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ensure session once on mount
  useEffect(() => {
    ensureSessionId().catch(() => {
      // don't hard-fail UI; backend will fallback to IP id anyway
    });
  }, []);

  const generateSchedule = async (prompt: string): Promise<GenerateResult> => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post("/api/chat", { prompt });

      // NEW SHAPE: { schedule: [...], usage: {...} }
      const schedule = response.data?.schedule ?? [];
      const usage = response.data?.usage as UsageInfo | undefined;

      const events: CalendarEvent[] = schedule.map((item: any) => {
        const start = parseDayTime(String(item.start));
        const end = parseDayTime(String(item.end));

        return {
          id: uid(),
          title: String(item.title ?? ""),
          location: String(item.location ?? ""),
          instructors: normalizeInstructors(item.instructors),
          start,
          end,
        };
      });

      const filtered = events.filter(
        (e) => !isNaN(e.start.getTime()) && !isNaN(e.end.getTime())
      );

      return { ok: true, events: filtered, usage };
    } catch (e: any) {
      const status = e?.response?.status;
      const data = e?.response?.data;

      // Your backend sends 429 with requiresAd flag
      if (status === 429 && data?.requiresAd) {
        return {
          ok: false,
          needsAd: true,
          message: data?.message ?? "Please watch an ad to continue.",
        };
      }

      setError("Error generating schedule");
      return {
        ok: false,
        needsAd: false,
        message: data?.message ?? "Error generating schedule",
      };
    } finally {
      setLoading(false);
    }
  };

  return { generateSchedule, loading, error, setError };
}
