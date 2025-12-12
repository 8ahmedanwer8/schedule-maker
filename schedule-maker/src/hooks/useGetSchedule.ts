import { useState } from "react";
import axios from "axios";
const parseTimeString = (time: string, modifier: string) => {
  let [hours, minutes] = time.split(":").map(Number);
  console.log(
    hours,
    minutes,
    time,
    modifier,
    modifier === "PM",
    modifier === "AM"
  );

  if (modifier === "PM" && hours < 12) {
    hours += 12;
  }
  if (modifier === "AM" && hours === 12) {
    hours = 0;
  }
  return { hours, minutes };
};

const parseDayTime = (dayTimeString: string): Date => {
  const [day, time, modifier] = dayTimeString.split(" ", 3);
  const today = new Date();

  const dayMap: { [key: string]: number } = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };

  const targetDayIndex = dayMap[day];
  const todayDayIndex = today.getDay();
  const daysUntilTargetDay = (targetDayIndex - todayDayIndex + 7) % 7;

  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + daysUntilTargetDay);
  const { hours, minutes } = parseTimeString(time, modifier);
  targetDate.setHours(hours, minutes, 0, 0);
  return targetDate;
};

const useGetSchedule = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const getSchedule = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post("http://localhost:5000/api/chat");

      const mutatedData = response.data.map((classItem: any) => ({
        ...classItem,
        start: parseDayTime(classItem.start),
        end: parseDayTime(classItem.end),
      }));
      setData(mutatedData);
    } catch (err) {
      setError("Error generating schedule");
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, getSchedule };
};

export default useGetSchedule;
