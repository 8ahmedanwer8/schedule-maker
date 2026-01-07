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
  Stack,
  FormLabel,
  useDisclosure,
  HStack,
  Alert,
  chakra,
  AlertIcon,
  Text,
} from "@chakra-ui/react";
import moment from "moment";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import html2canvas from "html2canvas";
import "react-big-calendar/lib/css/react-big-calendar.css";
import type { View } from "react-big-calendar";
import { Text as CText } from "@chakra-ui/react";
import useGenerateSchedule, {
  CalendarEvent,
} from "./hooks/useGenerateSchedule";
import {
  Calendar,
  momentLocalizer,
  DateLocalizer,
  EventPropGetter,
} from "react-big-calendar";

import { fetchUsageStatus, reportAdCompleted, UsageStatus } from "./usageApi";
import { ensureSessionId } from "./session";
import CommentSection from "./components/CommentSection";

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
  const [usage, setUsage] = React.useState<UsageStatus | null>(null);
  const [needsAdOpen, setNeedsAdOpen] = React.useState(false);
  const [pendingPrompt, setPendingPrompt] = React.useState<string>("");
  const [isDownloading, setIsDownloading] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      await ensureSessionId();
      const status = await fetchUsageStatus();
      setUsage(status);
    })().catch(() => {});
  }, []);
  const handleGenerate = async () => {
    const result = await generateSchedule(inputText);

    if (result.ok) {
      setEvents(result.events);

      // refresh usage display (or set from result.usage if you want)
      fetchUsageStatus()
        .then(setUsage)
        .catch(() => {});
      return;
    }

    if (result.needsAd) {
      setPendingPrompt(inputText);
      setNeedsAdOpen(true);
      return;
    }

    // normal error already set in hook
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

  const floorToHour = (mins: number) => Math.floor(mins / 60) * 60;
  const ceilToHour = (mins: number) => Math.ceil(mins / 60) * 60;

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

    const minM = floorToHour(Math.min(...startMins)); // always x:00
    const maxM = ceilToHour(Math.max(...endMins)); // always x:00

    min.setHours(Math.floor(minM / 60), 0, 0, 0);
    max.setHours(Math.floor(maxM / 60), 0, 0, 0);

    return [min, max];
  }, [events]);

  const nextPaint = () =>
    new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

  const handleDownload = async () => {
    if (!scheduleRef.current) return;

    setIsDownloading(true);

    // helper
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    try {
      // Wait for layout + fonts so html2canvas captures correctly
      // (fonts.ready exists in most modern browsers)
      // @ts-ignore
      if (document.fonts?.ready) {
        // @ts-ignore
        await document.fonts.ready;
      }
      await nextPaint();

      // Capture ONLY the calendar area
      const exportRoot = scheduleRef.current; // this is #schedule-export-root
      const calendarEl = exportRoot.querySelector(
        ".rbc-calendar"
      ) as HTMLElement;
      if (!calendarEl) return;

      // Create an offscreen container
      const offscreen = document.createElement("div");
      offscreen.style.position = "fixed";
      offscreen.style.left = "-10000px";
      offscreen.style.top = "0";
      offscreen.style.background = "white";
      offscreen.style.padding = "16px";

      // Match on-screen width so it looks the same
      const rect = calendarEl.getBoundingClientRect();
      offscreen.style.width = `${Math.ceil(rect.width)}px`;

      // Clone the calendar DOM
      const clone = calendarEl.cloneNode(true) as HTMLElement;
      clone.style.background = "#fff";
      // Add export-only CSS that removes scroll-cropping + unclamps text
      const style = document.createElement("style");
      style.innerHTML = `

          /* Force pure white backgrounds (prevents grey wash) */
        .rbc-calendar,
        .rbc-time-view,
        .rbc-time-content,
        .rbc-day-slot,
        .rbc-time-header,
        .rbc-time-header-content,
        .rbc-time-header-gutter,
        .rbc-timeslot-group {
          background: #fff !important;
        }

        /* Make grid lines lighter (optional, helps the “grey” look) */
        .rbc-time-slot,
        .rbc-timeslot-group,
        .rbc-day-slot .rbc-time-slot {
          border-color: rgba(0,0,0,0.08) !important;
        }

        /* Keep wrapping you already fixed */
        .rbc-event, .rbc-event-content {
          white-space: normal !important;
        }

        .rbc-calendar, .rbc-event, .rbc-event-content {
          font-family: Arial, sans-serif !important;
          line-height: 1.25 !important;
          box-sizing: border-box !important;
        }
      // `;

      offscreen.appendChild(style);
      offscreen.appendChild(clone);
      document.body.appendChild(offscreen);

      // Force the internal time grid to expand to its full height in the clone
      // const timeContent = offscreen.querySelector(
      //   ".rbc-time-content"
      // ) as HTMLElement | null;
      // const timeView = offscreen.querySelector(
      //   ".rbc-time-view"
      // ) as HTMLElement | null;

      // if (timeContent) {
      //   // scrollHeight gives full content height (even if it would scroll)
      //   timeContent.style.height = `${timeContent.scrollHeight}px`;
      // }
      // if (timeView) {
      //   timeView.style.height = `${timeView.scrollHeight}px`;
      // }

      // Let the browser reflow after applying heights
      await nextPaint();
      await sleep(0);

      const scale = 2; // fixed, consistent at any browser zoom
      const canvas = await html2canvas(clone, {
        backgroundColor: "#ffffff",
        scale,
        useCORS: true,
        logging: false,
        width: clone.scrollWidth,
        height: clone.scrollHeight,
        windowWidth: clone.scrollWidth,
        windowHeight: clone.scrollHeight,
        scrollX: 0,
        scrollY: 0,
      });
      const dataUrl = canvas.toDataURL("image/png");

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `schedule-${moment().format("YYYY-MM-DD_HHmm")}.png`;
      a.click();

      document.body.removeChild(offscreen);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const eventPropGetter: EventPropGetter<CalendarEvent> = (event) => {
    const duration =
      (event.end.getTime() - event.start.getTime()) / (1000 * 60);

    return {
      style: {
        // overflow: "hidden",
        padding: "2px 4px",
        fontSize: duration < 60 ? "10px" : "11px",
        // lineHeight: 1.15,
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
    const durationMin = (event.end.getTime() - event.start.getTime()) / 60000;
    const showMeta = durationMin >= 45;

    const timeText = `${moment(event.start).format("h:mm A")}–${moment(
      event.end
    ).format("h:mm A")}`;

    const metaParts = [
      showMeta ? event.location : "",
      showMeta && event.instructors?.length ? event.instructors.join(", ") : "",
    ].filter(Boolean);

    const metaText = metaParts.join(" • ");

    return (
      <Box cursor="pointer">
        <Text
          fontSize="10px"
          lineHeight="1.3"
          title={[timeText, event.title, metaText].filter(Boolean).join(" • ")}
        >
          <chakra.span opacity={0.95}>{timeText} </chakra.span>
          <chakra.strong style={{ fontWeight: 700 }}>
            {event.title}
          </chakra.strong>
          {metaText ? (
            <chakra.span style={{ opacity: 0.8 }}> • {metaText}</chakra.span>
          ) : null}
        </Text>
      </Box>
    );
  };
  // Interface for usage limit result
  interface UsageLimitResult {
    canProceed: boolean;
    reason:
      | "within_free_limit"
      | "using_ad_credit"
      | "need_to_watch_ad"
      | "max_daily_exceeded"
      | "user_not_found"
      | "system_error";
    remainingFree: number;
    adCredits: number;
    message?: string;
  }

  return (
    <Box
      height="100vh"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="flex-start"
      paddingTop="50px"
    >
      <Stack
        direction={{ base: "column", md: "row" }}
        spacing={3}
        mb={4}
        align="center"
      >
        <Button
          onClick={handleDownload}
          colorScheme="purple"
          variant="outline"
          size="sm"
          isDisabled={events.length === 0}
          isLoading={isDownloading}
          loadingText="Generating..."
          width={{ base: "100%", md: "auto" }}
        >
          📸 Download as Image
        </Button>

        <Text
          fontSize={{ base: "lg", md: "xl" }}
          fontWeight="bold"
          color="gray.700"
        >
          🤖 AI Schedule Maker
        </Text>
      </Stack>

      <Box width={{ base: "95%", md: "80%", lg: "70%", xl: "60%" }} px={4}>
        <VStack width="100%" spacing={2}>
          <Textarea
            size={{ base: "md", md: "lg" }}
            fontSize={{ base: "sm", md: "md" }}
            placeholder="Enter your schedule text here (e.g., class schedules, course info, etc.)&#10;&#10;Try: 'Math class Monday 2PM-3PM in Room 101 with Dr. Smith'&#10;Or paste course registration data!"
            width="100%"
            bg="white"
            boxShadow="sm"
            borderRadius="md"
            maxHeight={{ base: "160px", md: "200px" }}
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

      <Stack
        direction={{ base: "column", md: "row" }}
        spacing={3}
        mt={2}
        width="100%"
        align={{ base: "stretch", md: "center" }}
        justify="center"
      >
        <Button
          onClick={handleGenerate}
          isLoading={loading}
          loadingText="Generating..."
          colorScheme="blue"
          size={{ base: "md", md: "lg" }}
          isDisabled={!inputText.trim()}
          width={{ base: "100%", md: "auto" }}
        >
          {events.length ? "Regenerate Schedule" : "Generate Schedule"}
        </Button>

        <Button
          onClick={handleAddNew}
          colorScheme="green"
          size={{ base: "md", md: "lg" }}
          isDisabled={events.length === 0}
          width={{ base: "100%", md: "auto" }}
        >
          Add Event
        </Button>

        {events.length > 0 && (
          <Button
            onClick={handleClearSchedule}
            colorScheme="red"
            variant="outline"
            size={{ base: "md", md: "lg" }}
            width={{ base: "100%", md: "auto" }}
          >
            Clear All
          </Button>
        )}
      </Stack>

      <Box>
        <Text fontSize="sm" color="green.600" fontWeight="medium">
          {events.length > 0 && (
            <Box textAlign="center" mt={3}>
              <Text fontSize="sm" color="green.600" fontWeight="medium">
                ✓ {events.length} events generated successfully!
              </Text>
              <Text fontSize="xs" color="gray.500" mt={1}>
                Click any event to edit
              </Text>
            </Box>
          )}
        </Text>
      </Box>
      <Box
        width="100%"
        paddingX="4%"
        mt={4}
        ref={scheduleRef}
        id="schedule-export-root"
      >
        <Box
          width="100%"
          overflowX="auto"
          borderRadius="8px"
          sx={{ WebkitOverflowScrolling: "touch" }}
        ></Box>
        <Box minW="1100px">
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
            step={60}
            timeslots={1}
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
      </Box>
      <CommentSection />
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
      <Modal
        isOpen={needsAdOpen}
        onClose={() => setNeedsAdOpen(false)}
        isCentered
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Free limit reached</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text mb={3}>
              You've used your free generations for today. Watch an ad to get
              another generation.
            </Text>

            {usage && (
              <Box mt={2} fontSize="sm" color="gray.600" textAlign="center">
                Free left today: <b>{usage.remainingFree}</b> • Ad credits:{" "}
                <b>{usage.adCredits}</b> • Daily used: <b>{usage.dailyCount}</b>
                /{usage.limits.maxDailyUsage}
              </Box>
            )}
          </ModalBody>
          <ModalFooter>
            <HStack>
              <Button variant="ghost" onClick={() => setNeedsAdOpen(false)}>
                Not now
              </Button>
              <Button
                colorScheme="blue"
                onClick={async () => {
                  // MVP: pretend the user watched an ad
                  await reportAdCompleted();
                  const status = await fetchUsageStatus();
                  setUsage(status);

                  setNeedsAdOpen(false);

                  // retry generation
                  const retry = await generateSchedule(pendingPrompt);
                  if (retry.ok) {
                    setEvents(retry.events);
                    fetchUsageStatus()
                      .then(setUsage)
                      .catch(() => {});
                  }
                }}
              >
                I watched the ad ✅
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default HomePage;
