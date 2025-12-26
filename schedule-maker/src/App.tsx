import { Routes, Route } from "react-router-dom";
import HomePage from "./Homepage";
import { ChakraProvider } from "@chakra-ui/react";
import { Global } from "@emotion/react";

function App() {
  return (
    <ChakraProvider>
      <Global
        styles={{
          ".rbc-today": {
            backgroundColor: "transparent !important",
          },
          ".rbc-time-column .rbc-today": {
            backgroundColor: "transparent !important",
          },
          ".rbc-event-label": {
            display: "none",
          },
          ".rbc-time-header .rbc-allday-cell": {
            display: "none !important",
          },

          /* ✅ keep 30-min grid but DON'T make calendar taller */
          "#schedule-export-root .rbc-timeslot-group": {
            minHeight: "20px !important", // tweak: 18px–24px
          },

          /* Optional: hour lines stronger than half-hour lines */
          "#schedule-export-root .rbc-time-slot": {
            borderTop: "1px solid rgba(0,0,0,0.06) !important",
          },
          "#schedule-export-root .rbc-time-slot:nth-of-type(2n)": {
            borderTop: "1px solid rgba(0,0,0,0.14) !important",
          },

          /* Optional: tighter gutter labels */
          "#schedule-export-root .rbc-label": {
            fontSize: "11px !important",
            lineHeight: "1 !important",
          },
          "#schedule-export-root .rbc-event, #schedule-export-root .rbc-event-content":
            {
              whiteSpace: "normal !important",
              overflow: "hidden !important",
            },
        }}
      />

      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </ChakraProvider>
  );
}

export default App;
