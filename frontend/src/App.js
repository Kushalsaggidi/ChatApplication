import "./App.css";
import Home from "./Pages/Homepage";
import { Route } from "react-router-dom";
import Chat from "./Pages/Chatpage";
import { BrowserRouter, Routes } from "react-router-dom";
function App() {
  return (
    <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/chat" element={<Chat />} />
        </Routes>
    </div>
  );
}

export default App;
