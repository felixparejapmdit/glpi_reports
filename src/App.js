import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import "./App.css";
import Dashboard from "./components/Dashboard"; // This will contain only the login form
import WeeklyReports from "./components/WeeklyReports"; // New component for GLPI Reports
import PAR from "./components/PAR"; // Component for Post Activity Report
import TicketReports from "./components/TicketReports"; // New component for Ticket Reports
import Menubar from "./components/menubar"; // Menubar added for specific pages

const App = () => {
  const location = useLocation(); // Get the current route location

  // Conditionally display Menubar only on specific routes
  const showMenubar =
    location.pathname === "/weekly-reports" ||
    location.pathname === "/par-reports" ||
    location.pathname === "/ticket-reports"; // Include the TicketReports page

  return (
    <>
      {/* Conditionally render the Menubar based on the route */}
      {showMenubar && (
        <Menubar profileName="Admin" onLogout={() => alert("Logged Out")} />
      )}

      <Routes>
        {/* Route for the login page */}
        <Route path="/" element={<Dashboard />} />
        {/* Route for the Weekly Reports */}
        <Route path="/weekly-reports" element={<WeeklyReports />} />
        {/* Route for the PAR */}
        <Route path="/par-reports" element={<PAR />} />
        {/* Route for the Ticket Reports */}
        <Route path="/ticket-reports" element={<TicketReports />} />{" "}
        {/* New Route */}
      </Routes>
    </>
  );
};

export default App;
