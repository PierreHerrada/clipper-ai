import { Route, Routes } from "react-router-dom";
import Board from "./pages/Board";
import Chat from "./pages/Chat";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Status from "./pages/Status";

export default function App() {
  return (
    <div className="min-h-screen bg-deep text-white">
      <nav className="bg-navy border-b border-foam/8 px-6 py-3 flex items-center gap-6">
        <img src="/logo.svg" alt="Corsair" className="h-8 w-8" />
        <span className="text-foam font-semibold text-lg">corsair</span>
        <a href="/" className="text-mist hover:text-white text-sm">
          Board
        </a>
        <a href="/dashboard" className="text-mist hover:text-white text-sm">
          Dashboard
        </a>
        <a href="/status" className="text-mist hover:text-white text-sm">
          Status
        </a>
        <a href="/chat" className="text-mist hover:text-white text-sm">
          Chat
        </a>
      </nav>
      <Routes>
        <Route path="/" element={<Board />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/status" element={<Status />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </div>
  );
}
