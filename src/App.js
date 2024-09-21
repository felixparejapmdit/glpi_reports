// App.js
import React from "react";
import { Routes, Route } from "react-router-dom";
import "./App.css";
import Dashboard from "./components/Dashboard"; // Default to Dashboard as it contains the login form

const App = () => {
  return (
    <Routes>
      {/* Default to Dashboard */}
      <Route path="/" element={<Dashboard />} />
    </Routes>
  );
};

export default App;
