// src/App.js
import React, { useContext } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import "./App.css";
import Dashboard from "./components/Dashboard";
import WeeklyReports from "./components/WeeklyReports";
import PAR from "./components/PAR";
import TicketReports from "./components/TicketReports";
import PVReports from "./components/PVReports";
import Menubar from "./components/menubar";
import { UserContext } from "./UserContext"; // Import UserContext

const App = () => {
  const location = useLocation();
  const { username } = useContext(UserContext); // Access username from context

  const showMenubar =
    location.pathname === "/weekly-reports" ||
    location.pathname === "/par-reports" ||
    location.pathname === "/ticket-reports" ||
    location.pathname === "/pv-reports";

  return (
    <>
      {showMenubar && (
        <Menubar
          profileName={username || "Admin"}
          onLogout={() => alert("Logged Out")}
        />
      )}

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/weekly-reports" element={<WeeklyReports />} />
        <Route path="/par-reports" element={<PAR />} />
        <Route path="/ticket-reports" element={<TicketReports />} />
        <Route path="/pv-reports" element={<PVReports />} />
      </Routes>
    </>
  );
};

export default App;
