import {
  BrowserRouter as Router,
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";
import HomePage from "./Homepage";
import { ChakraProvider } from "@chakra-ui/react";

function App() {
  return (
    <div className="App">
      <ChakraProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </ChakraProvider>
    </div>
  );
}

export default App;
