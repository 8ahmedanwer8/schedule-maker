import { useState } from "react";
import axios from "axios";

export type CalendarEvent = {
  id: string;
  title: string;
  instructors: string[];
  location: string;
  start: Date;
  end: Date;
};

const uid = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto)
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

  const targetDayIndex = dayMap[day];
  const targetDate = new Date(startOfWeek);
  targetDate.setDate(startOfWeek.getDate() + (targetDayIndex ?? 0));

  const { hours, minutes } = parseTimeString(time, modifier);
  targetDate.setHours(hours, minutes, 0, 0);

  return targetDate;
};

const normalizeInstructors = (x: any): string[] => {
  if (Array.isArray(x)) return x.filter(Boolean).map(String);
  if (typeof x === "string") {
    const s = x.trim();
    if (!s || s === "undefined" || s === "null") return [];
    return s.split(",").map(t => t.trim()).filter(Boolean);
  }
  return [];
};

export default function useGenerateSchedule() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSchedule = async (prompt: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post("http://localhost:5000/api/chat", {
        prompt,
      });

      const events: CalendarEvent[] = (response.data ?? []).map((item: any) => {
        const start = parseDayTime(item.start);
        const end = parseDayTime(item.end);

        return {
          id: uid(),
          title: String(item.title ?? ""),
          location: String(item.location ?? ""),
          instructors: normalizeInstructors(item.instructors),
          start,
          end,
        };
      });

      // Filter invalid dates just in case
      return events.filter(e => !isNaN(e.start.getTime()) && !isNaN(e.end.getTime()));
    } catch (e) {
      setError("Error generating schedule");
      return [];
    } finally {
      setLoading(false);
    }
  };

  return { generateSchedule, loading, error, setError };
}
