import React, { useRef } from "react";
import {
  Box,
  Input,
  VStack,
  Button,
  Textarea,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  useDisclosure,
  HStack,
  Alert,
  AlertIcon,
  Text,
} from "@chakra-ui/react";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import moment from "moment";
import html2canvas from "html2canvas";
import "react-big-calendar/lib/css/react-big-calendar.css";
import type { View } from "react-big-calendar";
import useGenerateSchedule, {
  CalendarEvent,
} from "./hooks/useGenerateSchedule";
import {
  Calendar,
  momentLocalizer,
  DateLocalizer,
  EventPropGetter,
} from "react-big-calendar";

const TypedCalendar = Calendar<CalendarEvent>;

const localizer: DateLocalizer = momentLocalizer(moment);
const DragAndDropCalendar = withDragAndDrop<CalendarEvent>(TypedCalendar);
interface Event {
  title: string;
  instructors: string[];
  location: string;
  start: Date;
  end: Date;
}

const formats = {
  dayFormat: (date: Date) => moment(date).format("dddd"),
};

const HomePage: React.FC = () => {
  const scheduleRef = React.useRef<HTMLDivElement>(null);
  const [inputText, setInputText] = React.useState<string>("");
  const [isAddingNew, setIsAddingNew] = React.useState(false);
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const { generateSchedule, loading, error } = useGenerateSchedule();

  const handleGenerate = async () => {
    const newEvents = await generateSchedule(inputText);
    setEvents(newEvents);
  };

  const handleClearSchedule = () => {
    setEvents([]);
    setInputText("");
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
    setEditTitle("");
    setEditLocation("");
    setEditInstructors("");
    onOpen();
  };
  const handleLoadSample = () => {
    const sampleText = `Computer Science 101
    Monday Wednesday Friday 10:00 AM - 11:30 AM
    Room: Science Building 204
    Instructor: Dr. Smith

    Math 150 - Calculus I
    Tuesday Thursday 2:00 PM - 3:30 PM
    Location: Math Hall 101
    Prof. Johnson

    Physics Lab
    Wednesday 3:00 PM - 6:00 PM
    Lab Room B15
    Dr. Wilson, TA: Sarah`;
    setInputText(sampleText);
  };

  const hasWeekendEvents = React.useMemo(() => {
    return events.some((e) => {
      const d = e.start.getDay();
      return d === 0 || d === 6;
    });
  }, [events]);
  const calendarView: View = hasWeekendEvents ? "week" : "work_week";
  const visibleDays = React.useMemo(() => {
    // Mon-Fri only if no weekend classes, else Sun-Sat
    return hasWeekendEvents ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
  }, [hasWeekendEvents]);

  const WeekHeader = ({ date }: { date: Date }) => {
    return (
      <div style={{ fontWeight: 700 }}>
        {moment(date).format("ddd")} {/* Mon Tue Wed... */}
      </div>
    );
  };

  const STEP_MINUTES = 30;

  const floorToStep = (mins: number) =>
    Math.floor(mins / STEP_MINUTES) * STEP_MINUTES;

  const ceilToStep = (mins: number) =>
    Math.ceil(mins / STEP_MINUTES) * STEP_MINUTES;

  const [minTime, maxTime] = React.useMemo(() => {
    const min = new Date();
    const max = new Date();

    if (events.length === 0) {
      min.setHours(8, 0, 0, 0);
      max.setHours(22, 0, 0, 0);
      return [min, max];
    }

    const startMins = events.map(
      (e) => e.start.getHours() * 60 + e.start.getMinutes()
    );
    const endMins = events.map(
      (e) => e.end.getHours() * 60 + e.end.getMinutes()
    );

    const minM = floorToStep(Math.min(...startMins));
    const maxM = ceilToStep(Math.max(...endMins));

    min.setHours(Math.floor(minM / 60), minM % 60, 0, 0);
    max.setHours(Math.floor(maxM / 60), maxM % 60, 0, 0);

    return [min, max];
  }, [events]);

  const nextPaint = () =>
    new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

  const handleDownload = async () => {
    const node = scheduleRef.current;
    if (!node) return;

    // wait for layout (important right after adding/resizing events)
    await nextPaint();

    const headerEl = node.querySelector(
      ".rbc-time-header"
    ) as HTMLElement | null;
    const scrollerEl = node.querySelector(
      ".rbc-time-content"
    ) as HTMLElement | null;

    // export full scrollable height (not just what's visible)
    const headerH = headerEl?.getBoundingClientRect().height ?? 0;
    const bodyH = scrollerEl?.scrollHeight ?? node.scrollHeight;

    // small padding so nothing clips
    const exportHeight = Math.ceil(headerH + bodyH + 12);
    const exportWidth = Math.ceil(node.scrollWidth);

    const canvas = await html2canvas(node, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,

      // IMPORTANT: capture full content size
      width: exportWidth,
      height: exportHeight,
      windowWidth: exportWidth,
      windowHeight: exportHeight,

      scrollX: 0,
      scrollY: 0,

      onclone: (doc) => {
        const root = doc.getElementById(
          "schedule-export-root"
        ) as HTMLElement | null;
        if (!root) return;

        // Make sure export doesn't clip scrollable content
        const style = doc.createElement("style");
        style.innerHTML = `
        /* --- export-only fixes --- */
        #schedule-export-root { overflow: visible !important; max-height: none !important; height: auto !important; }

        /* the internal scroller that normally clips */
        #schedule-export-root .rbc-time-content { overflow: visible !important; max-height: none !important; height: auto !important; }

        /* keep header from clipping */
        #schedule-export-root .rbc-time-header,
        #schedule-export-root .rbc-time-header-content,
        #schedule-export-root .rbc-time-header-content .rbc-row {
          overflow: visible !important;
        }

        #schedule-export-root .rbc-time-header-content .rbc-header {
          padding-top: 6px !important;
          padding-bottom: 6px !important;
          line-height: 1.2 !important;
        }
      `;
        doc.head.appendChild(style);
      },
    });

    const img = canvas.toDataURL("image/png", 1.0);
    const link = document.createElement("a");
    link.download = `schedule-${moment().format("YYYY-MM-DD")}.png`;
    link.href = img;
    link.click();
  };

  const eventPropGetter: EventPropGetter<CalendarEvent> = (event) => {
    const duration =
      (event.end.getTime() - event.start.getTime()) / (1000 * 60);

    return {
      style: {
        overflow: "hidden",
        padding: "2px 4px",
        fontSize: duration < 60 ? "10px" : "11px",
        lineHeight: 1.15,
        borderRadius: "6px",
      },
    };
  };

  const dayPropGetter = (date: Date) => {
    if (!hasWeekendEvents) return {}; // work_week view: no weekends shown anyway

    const d = date.getDay(); // 0=Sun, 6=Sat
    const isWeekend = d === 0 || d === 6;

    return {
      style: isWeekend ? { backgroundColor: "rgba(255, 193, 7, 0.12)" } : {},
    };
  };

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editTitle, setEditTitle] = React.useState("");
  const [editLocation, setEditLocation] = React.useState("");
  const [editInstructors, setEditInstructors] = React.useState("");

  const [editingEventId, setEditingEventId] = React.useState<string | null>(
    null
  );

  const [newDay, setNewDay] = React.useState("Monday"); // Sunday..Saturday
  const [newStart, setNewStart] = React.useState("10:00");
  const [newEnd, setNewEnd] = React.useState("11:00");

  const handleEventSelect = (
    event: CalendarEvent,
    _e?: React.SyntheticEvent
  ) => {
    setEditingEventId(event.id);
    setEditTitle(event.title);
    setEditLocation(event.location);
    setEditInstructors(event.instructors.join(", "));
    setIsAddingNew(false);
    onOpen();
  };

  const startOfThisWeekSunday = () => {
    const d = new Date();
    const sunday = new Date(d);
    sunday.setDate(d.getDate() - d.getDay());
    sunday.setHours(0, 0, 0, 0);
    return sunday;
  };

  const dayIndex: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };

  const makeDateInWeek = (day: string, hhmm: string) => {
    const [hh, mm] = hhmm.split(":").map(Number);
    const base = startOfThisWeekSunday();
    const d = new Date(base);
    d.setDate(base.getDate() + (dayIndex[day] ?? 1));
    d.setHours(hh, mm, 0, 0);
    return d;
  };
  const start = makeDateInWeek(newDay, newStart);
  const end = makeDateInWeek(newDay, newEnd);

  const handleEventUpdate = () => {
    if (isAddingNew) {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const newEvent: CalendarEvent = {
        id,
        title: editTitle,
        location: editLocation,
        instructors: editInstructors
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        start: start,
        end: end,
      };

      setEvents((prev) => [...prev, newEvent]);
      onClose();
      return;
    }

    if (!editingEventId) return;

    setEvents((prev) =>
      prev.map((e) =>
        e.id === editingEventId
          ? {
              ...e,
              title: editTitle,
              location: editLocation,
              instructors: editInstructors
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            }
          : e
      )
    );
    onClose();
  };

  const calendarDate = events[0]?.start ?? new Date();

  const handleEventDelete = () => {
    if (!editingEventId) return;
    setEvents((prev) => prev.filter((e) => e.id !== editingEventId));
    onClose();
  };

  // Drag and Drop handlers
  const handleEventDrop = ({ event, start, end, allDay }: any) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === event.id ? { ...e, start, end, allDay } : e))
    );
  };

  const handleEventResize = ({ event, start, end }: any) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === event.id ? { ...e, start, end } : e))
    );
  };

  const CustomEvent = ({ event }: { event: CalendarEvent }) => {
    const durationMin =
      (event.end.getTime() - event.start.getTime()) / (1000 * 60);

    const showLocation = durationMin >= 75;
    const showInstructors = durationMin >= 90;

    const timeText = `${moment(event.start).format("h:mm A")} – ${moment(
      event.end
    ).format("h:mm A")}`;

    const clamp = (lines: number) => ({
      display: "-webkit-box",
      WebkitBoxOrient: "vertical" as const,
      WebkitLineClamp: lines,
      overflow: "hidden",
    });

    return (
      <div style={{ cursor: "pointer" }}>
        <div style={{ fontSize: "10px", opacity: 0.95, ...clamp(1) }}>
          {timeText}
        </div>

        <div
          style={{
            fontSize: durationMin < 60 ? "10px" : "11px",
            fontWeight: 700,
            marginTop: "2px",
            ...clamp(durationMin < 60 ? 1 : 2),
          }}
        >
          {event.title}
        </div>

        {showLocation && event.location && (
          <div
            style={{
              fontSize: "10px",
              opacity: 0.85,
              marginTop: "2px",
              ...clamp(1),
            }}
          >
            📍 {event.location}
          </div>
        )}

        {showInstructors && event.instructors?.length > 0 && (
          <div
            style={{
              fontSize: "9px",
              opacity: 0.75,
              marginTop: "2px",
              ...clamp(1),
            }}
          >
            👤 {event.instructors.join(", ")}
          </div>
        )}
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
      <HStack spacing={3} mb={4}>
        <Button
          onClick={handleDownload}
          colorScheme="purple"
          variant="outline"
          size="sm"
          isDisabled={events.length === 0}
        >
          📸 Download as Image
        </Button>
        <Text fontSize="xl" fontWeight="bold" color="gray.700">
          🤖 AI Schedule Maker
        </Text>
      </HStack>
      <Box width={["90%", "80%", "70%", "60%"]} paddingX={4}>
        <VStack width="100%" spacing={2}>
          <Textarea
            placeholder="Enter your schedule text here (e.g., class schedules, course info, etc.)&#10;&#10;Try: 'Math class Monday 2PM-3PM in Room 101 with Dr. Smith'&#10;Or paste course registration data!"
            size="lg"
            width="100%"
            bg="white"
            boxShadow="sm"
            borderRadius="md"
            maxHeight="200px"
            overflowY="auto"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <HStack width="100%" justifyContent="flex-end">
            <Button size="sm" variant="ghost" onClick={handleLoadSample}>
              Load Sample 📝
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setInputText("")}>
              Clear ✖️
            </Button>
          </HStack>
        </VStack>
      </Box>
      {error && (
        <Alert status="error" borderRadius="md" mb={4}>
          <AlertIcon />
          {error}
        </Alert>
      )}

      <HStack spacing={4}>
        <Button
          onClick={handleGenerate}
          isLoading={loading}
          loadingText="Generating..."
          colorScheme="blue"
          size="lg"
          isDisabled={!inputText.trim()}
        >
          {events.length ? "Regenerate Schedule" : "Generate Schedule"}
        </Button>
        <Button
          onClick={handleAddNew}
          colorScheme="green"
          size="lg"
          isDisabled={events.length === 0}
        >
          Add Event
        </Button>

        {events.length > 0 && (
          <Button
            onClick={handleClearSchedule}
            colorScheme="red"
            variant="outline"
            size="lg"
          >
            Clear All
          </Button>
        )}
      </HStack>

      <Box textAlign="center" mt={3}>
        <Text fontSize="sm" color="green.600" fontWeight="medium">
          ✓ {events.length} events generated successfully!
        </Text>
        <Text fontSize="xs" color="gray.500" mt={1}>
          Click any event to edit • All events show in current week view
        </Text>
      </Box>

      <Box
        width="100%"
        paddingX="4%"
        mt={4}
        ref={scheduleRef}
        id="schedule-export-root"
      >
        <DragAndDropCalendar
          localizer={localizer}
          date={calendarDate}
          events={events}
          onSelectEvent={handleEventSelect}
          dayPropGetter={dayPropGetter}
          startAccessor={(e) => e.start}
          endAccessor={(e) => e.end}
          resizable
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          toolbar={false}
          style={{
            width: "100%",
            height: "600px",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
          defaultView={calendarView}
          view={calendarView}
          views={{ week: true, work_week: true }}
          eventPropGetter={eventPropGetter}
          step={30}
          timeslots={2}
          components={{
            event: CustomEvent,
            week: { header: WeekHeader as any },
            work_week: { header: WeekHeader as any },
          }}
          formats={formats}
          min={minTime}
          max={maxTime}
          scrollToTime={minTime}
          dayLayoutAlgorithm="no-overlap"
        />
      </Box>
      <Box py="20px" fontSize="14px">
        Made by Ahmed
      </Box>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {isAddingNew && (
              <>
                <FormControl>
                  <FormLabel>Day</FormLabel>
                  <select
                    value={newDay}
                    onChange={(e) => setNewDay(e.target.value)}
                  >
                    {[
                      "Sunday",
                      "Monday",
                      "Tuesday",
                      "Wednesday",
                      "Thursday",
                      "Friday",
                      "Saturday",
                    ].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </FormControl>

                <FormControl>
                  <FormLabel>Start</FormLabel>
                  <Input
                    type="time"
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>End</FormLabel>
                  <Input
                    type="time"
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                  />
                </FormControl>
              </>
            )}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Title</FormLabel>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Location</FormLabel>
                <Input
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Instructors (comma separated)</FormLabel>
                <Input
                  value={editInstructors}
                  onChange={(e) => setEditInstructors(e.target.value)}
                  placeholder="John Doe, Jane Smith"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={3}>
              <Button colorScheme="red" onClick={handleEventDelete}>
                Delete
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button colorScheme="blue" onClick={handleEventUpdate}>
                Update
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default HomePage;
