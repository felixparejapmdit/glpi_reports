import React, { useState, useEffect } from "react";
import { fetchTicketsWithTasks, setAuthToken } from "../services/glpiService"; // Import your services
import "./PVReports.css";

// Helper function to get the week number from a date
const getWeekNumber = (date) => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

const PVReports = () => {
  const [year, setYear] = useState(2024); // Set the default year
  const [week, setWeek] = useState(1); // Set the default week
  const [tasks, setTasks] = useState([]); // Holds the fetched tasks
  const [loading, setLoading] = useState(true);

  // Generate the list of years for the dropdown
  const years = [2024, 2025, 2026, 2027, 2028, 2029];
  // Generate the list of weeks (1 to 52 weeks)
  const weeks = Array.from({ length: 52 }, (_, index) => index + 1);

  // Fetch ticket tasks based on the selected week and year
  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      try {
        // Assuming the first day of the selected week (Monday) in the given year
        const selectedDate = new Date(year, 0, (week - 1) * 7 + 1);
        const weekNumber = getWeekNumber(selectedDate); // Get the correct week number
        console.log("Fetching tasks for week:", weekNumber);

        // Replace with your API logic to fetch tasks for this week
        const tasksData = await fetchTicketsWithTasks(weekNumber);
        setTasks(tasksData.ticket_tasks || []); // Set tasks from the fetched ticket
      } catch (error) {
        console.error("Error fetching tasks:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [year, week]); // Re-fetch tasks when year or week changes

  // Group tasks by day
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  return (
    <div className="pv-reports-container">
      <h1>PV Reports</h1>
      <div className="dropdowns-container">
        <div className="dropdown">
          <label>Year: </label>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
          >
            {years.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>
        <div className="dropdown">
          <label>Week: </label>
          <select
            value={week}
            onChange={(e) => setWeek(parseInt(e.target.value))}
          >
            {weeks.map((wk) => (
              <option key={wk} value={wk}>
                Week {wk}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p>Loading tasks...</p>
      ) : (
        days.map((day) => (
          <div key={day} className="day-section">
            <h2>{day}</h2>
            <div className="team-cards">
              {tasks
                .filter((task) => task.day === day) // Assuming each task has a "day" property
                .map((task, index) => (
                  <div key={index} className="task-card">
                    <h3>Team {task.team}</h3>
                    <p>
                      <strong>Task:</strong> {task.content || "N/A"}
                    </p>
                    <p>
                      <strong>Date:</strong>{" "}
                      {new Date(task.date).toLocaleDateString()}
                    </p>
                    <p>
                      <strong>Short Description:</strong>{" "}
                      {task.short_description || "N/A"}
                    </p>
                    <p>
                      <strong>Total Manhours:</strong>{" "}
                      {task.total_manhours || "N/A"}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default PVReports;
