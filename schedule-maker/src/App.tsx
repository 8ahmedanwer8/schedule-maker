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
        }}
      />

      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </ChakraProvider>
  );
}

export default App;
