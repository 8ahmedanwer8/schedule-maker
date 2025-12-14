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
  Text
} from "@chakra-ui/react";
import { Calendar, momentLocalizer, DateLocalizer } from "react-big-calendar";
import moment from "moment";
import html2canvas from "html2canvas";
import "react-big-calendar/lib/css/react-big-calendar.css";
import useGenerateSchedule, { CalendarEvent } from "./hooks/useGenerateSchedule";


const localizer: DateLocalizer = momentLocalizer(moment);
interface Event {
  title: string;
  instructors: string[];
  location: string;
  start: Date;
  end: Date;
}

const CustomToolbar = () => {
  const startOfWeek = new Date();
  const dayOfWeek = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  return (
    <Box mb={4} p={3} bg="gray.50" borderRadius="md" textAlign="center">
      <Text fontSize="lg" fontWeight="bold" color="gray.700">
        📅 Weekly Schedule: {moment(startOfWeek).format('MMM D')} - {moment(endOfWeek).format('MMM D, YYYY')}
      </Text>
      <Text fontSize="sm" color="gray.600" mt={1}>
        Current week • Events are automatically placed in this week
      </Text>
    </Box>
  );
};

const formats = {
  dayFormat: (date: Date) => moment(date).format("dddd"),
};

const HomePage: React.FC = () => {
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

const [minTime, maxTime] = React.useMemo(() => {
  const min = new Date();
  const max = new Date();

  // Default view window when there are no events
  if (events.length === 0) {
    min.setHours(8, 0, 0, 0);
    max.setHours(22, 0, 0, 0);
    return [min, max];
  }

  const startMins = events.map(e => e.start.getHours() * 60 + e.start.getMinutes());
  const endMins = events.map(e => e.end.getHours() * 60 + e.end.getMinutes());

  const minMins = Math.min(...startMins);
  const maxMins = Math.max(...endMins);

  const minHour = Math.max(0, Math.floor(minMins / 60) - 1);
  const maxHour = Math.min(23, Math.ceil(maxMins / 60) + 1);

  min.setHours(minHour, 0, 0, 0);
  max.setHours(maxHour, 59, 0, 0);

  return [min, max];
}, [events]);


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

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editTitle, setEditTitle] = React.useState("");
  const [editLocation, setEditLocation] = React.useState("");
  const [editInstructors, setEditInstructors] = React.useState("");



  const [editingEventId, setEditingEventId] = React.useState<string | null>(null);

  const handleEventSelect = (event: CalendarEvent) => {
    setEditingEventId(event.id);
    setEditTitle(event.title);
    setEditLocation(event.location);
    setEditInstructors(event.instructors.join(", "));
    setIsAddingNew(false);
    onOpen();
  };

  const handleEventUpdate = () => {
    if (isAddingNew) {
      const id =
        (typeof crypto !== "undefined" && "randomUUID" in crypto)
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const newEvent: CalendarEvent = {
        id,
        title: editTitle,
        location: editLocation,
        instructors: editInstructors.split(",").map(s => s.trim()).filter(Boolean),
        start: new Date(),
        end: new Date(Date.now() + 60 * 60 * 1000),
      };

      setEvents(prev => [...prev, newEvent]);
      onClose();
      return;
    }

    if (!editingEventId) return;

    setEvents(prev =>
      prev.map(e =>
        e.id === editingEventId
          ? {
            ...e,
            title: editTitle,
            location: editLocation,
            instructors: editInstructors.split(",").map(s => s.trim()).filter(Boolean),
          }
          : e
      )
    );
    onClose();
  };

  const calendarDate = events[0]?.start ?? new Date();

  const handleEventDelete = () => {
    if (!editingEventId) return;
    setEvents(prev => prev.filter(e => e.id !== editingEventId));
    onClose();
  };

  const CustomEvent = ({ event }: any) => {
    return (
      <div style={{
        cursor: 'pointer',
        padding: '2px 4px',
        height: '100%',
        overflow: 'hidden'
      }}>
        <div style={{
          fontSize: "11px",
          fontWeight: "bold",
          marginBottom: '2px',
          lineHeight: '1.1'
        }}>
          {event.title}
        </div>
        {event.location && (
          <div style={{
            fontSize: "10px",
            opacity: 0.8,
            lineHeight: '1.1'
          }}>
            📍 {event.location}
          </div>
        )}
        {event.instructors && event.instructors !== "undefined" && (
          <div style={{
            fontSize: "9px",
            opacity: 0.7,
            lineHeight: '1.1'
          }}>
            👤 {Array.isArray(event.instructors) ? event.instructors.join(', ') : event.instructors}
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
          <Button onClick={handleClearSchedule} colorScheme="red" variant="outline" size="lg">
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

      <Box width="100%" paddingX="4%" id="schedule" mt={4}>
        <Calendar
          localizer={localizer}
          date={calendarDate}
          events={events}
          onSelectEvent={handleEventSelect}
          startAccessor="start"
          endAccessor="end"
          style={{
            width: "100%",
            height: "600px",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          }}
          defaultView={"week"}
          view={"week"}
          views={{ week: true }}
          eventPropGetter={eventPropGetter}
          step={30}
          timeslots={2}
          components={{
            event: CustomEvent,
          }}
          formats={formats}
          min={minTime}
          max={maxTime}
          popup={true}
          scrollToTime={minTime}
        />
      </Box>
      <Box py="20px" fontSize="14px">
        Made by Ahmed
      </Box>

      {/* Edit Event Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{isAddingNew ? 'Add New Event' : 'Edit Event'}</ModalHeader>
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
