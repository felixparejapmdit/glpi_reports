import React, { useState, useEffect } from "react";
import {
  fetchTickets,
  fetchGroups,
  fetchTicketsWithTasks,
  setAuthToken,
} from "../services/glpiService"; // Import your services
import "./PVReports.css"; // Import the necessary CSS

// Helper function to get the week number from a date
const getWeekNumber = (date) => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

// Helper function to get the current week
const getCurrentWeek = () => {
  const today = new Date();
  return getWeekNumber(today);
};

// Helper function to get the date for a given day in the selected week
const getDateOfWeekDay = (year, week, dayIndex) => {
  const firstDayOfYear = new Date(year, 0, 1);
  const daysOffset = (week - 1) * 7 + dayIndex;
  const firstMonday = firstDayOfYear.getDate() - firstDayOfYear.getDay() + 1;
  return new Date(year, 0, firstMonday + daysOffset);
};

const PVReports = () => {
  const [year, setYear] = useState(new Date().getFullYear()); // Default to the current year
  const [week, setWeek] = useState(getCurrentWeek()); // Default to the current week
  const [tickets, setTickets] = useState([]); // Holds fetched tickets
  const [teams, setTeams] = useState({}); // Holds team data
  const [loading, setLoading] = useState(true);

  // Generate the list of years for the dropdown
  const years = [2024, 2025, 2026, 2027, 2028, 2029];
  // Generate the list of weeks (1 to 52 weeks)
  const weeks = Array.from({ length: 52 }, (_, index) => index + 1);

  // Fetch tickets and teams
  useEffect(() => {
    const fetchTicketsAndTeams = async () => {
      setLoading(true);
      try {
        // Fetch teams (e.g., Team 1, Team 2)
        const groupData = await fetchGroups(26); // Example entity ID: 26
        const teamMap = {};
        groupData.items.forEach((group) => {
          group.group_users.forEach((user) => {
            teamMap[user.user.id] = group.name;
          });
        });
        setTeams(teamMap);

        // Fetch tickets for the selected week
        const ticketsData = await fetchTickets();
        const ticketsWithTasks = await Promise.all(
          ticketsData.map(async (ticket) => {
            const ticketWithTasks = await fetchTicketsWithTasks(ticket.id);
            return ticketWithTasks;
          })
        );
        setTickets(ticketsWithTasks); // Store tickets in state
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTicketsAndTeams();
  }, [year, week]); // Re-fetch when year or week changes
  // Group tickets by day (Monday to Sunday)
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  // Helper function to filter tasks based on the actual date of the day in the selected week
  const getTasksForDayAndTeam = (date, teamId) => {
    return tickets.filter((ticket) => {
      if (!ticket.ticket_tasks || ticket.ticket_tasks.length === 0) {
        return false; // No tasks available
      }

      // Filter tasks that belong to the correct date and team
      const matchingTasks = ticket.ticket_tasks.filter((task) => {
        const taskDate = new Date(task.start_date); // Convert start_date to Date object
        const isMatchingDate = taskDate.toDateString() === date.toDateString(); // Match exact date

        // Check if the team matches
        const taskTeam = teams[ticket.ticket_users[0]?.user?.id];
        const isMatchingTeam = taskTeam === teams[teamId];

        return isMatchingDate && isMatchingTeam;
      });

      return matchingTasks.length > 0;
    });
  };

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
        days.map((day, dayIndex) => {
          const date = getDateOfWeekDay(year, week, dayIndex); // Calculate the date for the current day in the selected week
          return (
            <div key={day} className="day-section">
              <h2>{day}</h2>
              {Object.keys(teams).map((teamId) => (
                <div key={teamId} className="team-section">
                  <h3>{teams[teamId]}</h3>
                  <div className="team-cards">
                    {getTasksForDayAndTeam(date, teamId).length === 0 ? (
                      <p>No tasks available for this team.</p>
                    ) : (
                      getTasksForDayAndTeam(date, teamId).map(
                        (ticket, index) => (
                          <div key={index} className="task-card">
                            {ticket.ticket_tasks.map((task, taskIndex) => (
                              <div key={taskIndex}>
                                <p>
                                  <strong>Task:</strong> {task.content || "N/A"}
                                </p>
                                <p>
                                  <strong>Date:</strong>{" "}
                                  {new Date(
                                    task.start_date
                                  ).toLocaleDateString()}
                                </p>
                                <p>
                                  <strong>Short Description:</strong>{" "}
                                  {task.short_description || "N/A"}
                                </p>
                                <p>
                                  <strong>Total Manhours:</strong>{" "}
                                  {task.duration_hr || "N/A"}
                                </p>
                              </div>
                            ))}
                          </div>
                        )
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
};

export default PVReports;
