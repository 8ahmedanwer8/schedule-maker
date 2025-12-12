import React, { useRef } from "react";
import { Box, Input, VStack, Button, Textarea } from "@chakra-ui/react";
import { Calendar, momentLocalizer, DateLocalizer } from "react-big-calendar";
import moment from "moment";
import useGetSchedule from "./hooks/useGetSchedule";
import axios from "axios";
import html2canvas from "html2canvas";
import "react-big-calendar/lib/css/react-big-calendar.css";
import jsPDF from "jspdf";

const localizer: DateLocalizer = momentLocalizer(moment);
interface Event {
  title: string;
  instructors: string[];
  location: string;
  start: Date;
  end: Date;
}

const events = [
  {
    title: "Meeting with John",
    start: new Date(2024, 9, 22, 10, 0),
    end: new Date(2024, 9, 22, 11, 0),
  },
  {
    title: "Lunch with Team",
    start: new Date(2024, 9, 23, 12, 0),
    end: new Date(2024, 9, 23, 13, 0),
  },
  {
    title: "Project Review",
    start: new Date(2024, 9, 24, 14, 0),
    end: new Date(2024, 9, 24, 15, 30),
  },
];

const CustomToolbar = () => {
  return <div></div>;
};

const formats = {
  dayFormat: (date: Date) => moment(date).format("dddd"),
};

const HomePage: React.FC = () => {
  const calendarRef = useRef<HTMLDivElement>(null);

  const { data, loading, error, getSchedule } = useGetSchedule();
  console.log(data);

  const minHour = Math.min(
    ...(data?.map((event: Event) => event?.start?.getHours()) ?? [8])
  );
  const minMinutes = Math.min(
    ...(data?.map((event: Event) => event?.start?.getMinutes()) ?? [8])
  );
  const minTime = new Date();
  minTime.setHours(minHour);
  minTime.setMinutes(minMinutes);

  const maxHour = Math.max(
    ...(data?.map((event: Event) => event?.end?.getHours()) ?? [17])
  );
  const maxMinutes = Math.max(
    ...(data?.map((event: Event) => event?.end?.getMinutes()) ?? [17])
  );
  const maxTime = new Date();
  maxTime.setHours(maxHour);
  maxTime.setMinutes(maxMinutes);

  console.log(minTime, maxTime);

  const handleDownload = () => {
    const scheduleElement: any = document.getElementById("schedule");
    html2canvas(scheduleElement).then((canvas) => {
      const img = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = "schedule.png";
      link.href = img;
      link.click();
    });
  };

  const stringToColor = (string: string) => {
    let hash = 0;
    for (let i = 0; i < string.length; i++) {
      hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = "#";
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xff;
      color += ("00" + value.toString(16)).slice(-2);
    }
    return color;
  };

  const eventPropGetter = (event: Event) => {
    const duration =
      (event.end.getTime() - event.start.getTime()) / (1000 * 60);
    let minHeight = 30;
    if (duration >= 60) {
      minHeight = duration / 2;
    }

    return {
      style: {
        minHeight: `${minHeight}px`,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        padding: "4px",
        fontSize: duration < 60 ? "10px" : "12px",
      },
    };
  };

  const CustomEvent = ({ event }: any) => {
    return (
      <div>
        <div style={{ fontSize: "12px", fontWeight: "bold" }}>
          {event.title}
        </div>
        <div style={{ fontSize: "12px" }}>{event.location}</div>
        <div style={{ fontSize: "12px" }}>
          {event.instructors !== "undefined" ? event.instructors : ""}
        </div>
      </div>
    );
  };
  return (
    <Box
      height="100vh"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="flex-start"
      paddingTop="50px"
    >
      <Button onClick={handleDownload}>Download as Image</Button>
      <Box width={["90%", "80%", "70%", "60%"]} paddingX={4}>
        <Textarea
          placeholder="Enter your text here"
          size="lg"
          width="100%"
          bg="white"
          boxShadow="sm"
          borderRadius="md"
          maxHeight="200px"
          overflowY="auto"
        />
      </Box>
      <Button onClick={getSchedule}>Generate schedule</Button>

      <Box width="100%" paddingX="4%" id="schedule">
        <Calendar
          localizer={localizer}
          events={data != null ? data : events}
          startAccessor="start"
          endAccessor="end"
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          }}
          defaultView={"week"}
          views={{ week: true, day: true }}
          eventPropGetter={eventPropGetter}
          step={30}
          timeslots={2}
          components={{
            event: CustomEvent,
            toolbar: CustomToolbar,
          }}
          formats={formats}
          min={minTime}
          max={maxTime}
        />
      </Box>
      <Box py="20px" fontSize="14px">
        Made by Ahmed
      </Box>
    </Box>
  );
};

export default HomePage;
