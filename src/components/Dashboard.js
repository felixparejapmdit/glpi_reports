// src/components/Dashboard.js
import React, { useState, useEffect } from "react";
import "./Dashboard.css";
import axios from "axios";
import {
  fetchTicketsByUserId,
  fetchUser,
  fetchGroups,
  setAuthToken,
} from "../services/glpiService";

const Dashboard = () => {
  const [tickets, setTickets] = useState([]); // For the tickets to display

  const [userStats, setUserStats] = useState({});
  const [teams, setTeams] = useState([]); // For the team dropdown
  const [filteredData, setFilteredData] = useState([]);
  const [filterTeam, setFilterTeam] = useState("All");
  const [filterTime, setFilterTime] = useState("All");
  const [filterSpecificTime, setFilterSpecificTime] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [users, setUsers] = useState({}); // To store user names
  const pageSize = 15; // Pagination page size
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch teams after successful login
  const loadTeams = async () => {
    try {
      const response = await fetchGroups(); // Use the token stored by setAuthToken
      setTeams(response.items || []); // Assuming response contains a list of teams in `items`
    } catch (error) {
      console.error("Error loading teams:", error);
    }
  };

  // Helper function to calculate ticket duration
  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 0;
    const start = new Date(startTime);
    const end = new Date(endTime);
    return (end - start) / (1000 * 60 * 60); // Return duration in hours
  };

  // Fetch teams and user data after successful login
  const loadTeamsAndUsers = async () => {
    try {
      const responseGroups = await fetchGroups(26); // Replace with actual entity_id
      console.log(responseGroups);
      const groupData = responseGroups.items || [];
      setTeams(groupData); // Set group data

      const users = {}; // To store all users' data

      // Process each group and its users
      for (let group of groupData) {
        if (Array.isArray(group.group_users)) {
          for (let groupUser of group.group_users) {
            const userId = groupUser.user.id;
            if (!users[userId]) {
              users[userId] = {
                name:
                  `${groupUser.user.first_name} ${groupUser.user.last_name}` ||
                  "Unknown User",
                totalTasks: 0,
                closedTickets: 0,
                openTickets: 0,
                groupId: group.id,
              };
            }
          }
        }
      }

      // Fetch tickets for each user and update stats
      for (const userId in users) {
        const userTickets = await fetchTicketsByUserId(userId);
        const closedTickets = userTickets.filter(
          (ticket) => ticket.status === "closed"
        ).length;
        const openTickets = userTickets.filter(
          (ticket) => ticket.status === "open"
        ).length;
        const totalTasks = userTickets.length;

        // Update user stats
        users[userId].closedTickets = closedTickets;
        users[userId].openTickets = openTickets;
        users[userId].totalTasks = totalTasks;
      }

      setUserStats(users); // Set user statistics
    } catch (err) {
      console.error("Error loading teams and users:", err);
      setError("Failed to load data.");
    } finally {
      setLoading(false); // Set loading to false when done
    }
  };

  // Handle login submission
  const handleLogin = async (event) => {
    event.preventDefault();
    const data = new URLSearchParams();
    data.append("username", username);
    data.append("password", password);

    try {
      const response = await axios.post(
        "http://trg-itsm.1914inc.net:8080/auth/login",
        data,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            accept: "application/json",
          },
        }
      );

      console.log("Login Response:", response.data); // Log the response to see what comes back

      // The token is located in response.data.access_token
      const authToken = response.data.access_token;
      if (authToken) {
        setAuthToken(authToken); // Store token and set Authorization header globally
        setIsLoggedIn(true); // Update the login state
        await loadTeamsAndUsers(); // Fetch teams and users after successful login
        await loadTeams(); // Fetch teams after successful login
      } else {
        setError("Login failed. No token received.");
      }
    } catch (error) {
      setError("Login failed. Please check your credentials.");
      console.error("Login error:", error);
    }
  };

  // Handle filtering data by team and time range
  const filterData = () => {
    let filtered = teams; // Initially use the unfiltered teams data

    if (filterTeam !== "All") {
      filtered = filtered.filter((team) => team.id === filterTeam);
    }

    // Apply time filter
    switch (filterTime) {
      case "weekly":
        filtered = filtered.filter((team) => team.week === filterSpecificTime);
        break;
      case "monthly":
        filtered = filtered.filter((team) => team.month === filterSpecificTime);
        break;
      case "yearly":
        filtered = filtered.filter((team) => team.year === filterSpecificTime);
        break;
      default:
        break;
    }

    setFilteredData(filtered);
  };

  useEffect(() => {
    filterData(); // Filter data on team or time filter change
  }, [filterTeam, filterTime, filterSpecificTime, teams]);

  // Pagination logic
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);
  const totalPages = Math.ceil(filteredData.length / pageSize);

  // If not logged in, display the login form
  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <h2>Sign In</h2>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="error">{error}</p>}
          <button type="submit">Sign In</button>
        </form>
      </div>
    );
  }

  // Show the dashboard after successful login
  return (
    <div className="dashboard-container">
      <h1>GLPI Reports</h1>

      {/* Filter by Team */}
      <div className="filter-container">
        <label htmlFor="team-filter">Team: </label>
        <select
          id="team-filter"
          value={filterTeam}
          onChange={(e) => setFilterTeam(e.target.value)}
        >
          <option value="All">All</option>
          {teams.map((team, index) => (
            <option key={index} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      {/* Filter by Time (Weekly, Monthly, Yearly, All) */}
      <div className="filter-container">
        <label htmlFor="time-filter">Filter by: </label>
        <select
          id="time-filter"
          value={filterTime}
          onChange={(e) => {
            setFilterTime(e.target.value);
            setFilterSpecificTime(""); // Reset specific time filter
          }}
        >
          <option value="All">All</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>

        {/* Weekly Filter */}
        {filterTime === "weekly" && (
          <select
            id="week-filter"
            value={filterSpecificTime}
            onChange={(e) => setFilterSpecificTime(e.target.value)}
          >
            {Array.from({ length: 52 }, (_, i) => `Week ${i + 1}`).map(
              (week, index) => (
                <option key={index} value={week}>
                  {week}
                </option>
              )
            )}
          </select>
        )}

        {/* Monthly Filter */}
        {filterTime === "monthly" && (
          <select
            id="month-filter"
            value={filterSpecificTime}
            onChange={(e) => setFilterSpecificTime(e.target.value)}
          >
            {[
              "January",
              "February",
              "March",
              "April",
              "May",
              "June",
              "July",
              "August",
              "September",
              "October",
              "November",
              "December",
            ].map((month, index) => (
              <option key={index} value={month}>
                {month}
              </option>
            ))}
          </select>
        )}

        {/* Yearly Filter */}
        {filterTime === "yearly" && (
          <select
            id="year-filter"
            value={filterSpecificTime}
            onChange={(e) => setFilterSpecificTime(e.target.value)}
          >
            {Array.from(
              { length: 10 },
              (_, i) => new Date().getFullYear() - i
            ).map((year, index) => (
              <option key={index} value={year}>
                {year}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Displaying Table */}
      <table className="report-table">
        <thead>
          <tr>
            <th>Name</th>
            <th># of Closed Tickets</th>
            <th># of Open Tickets</th>
            <th># of Tasks</th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.length > 0 ? (
            paginatedData.map((ticket, index) => (
              <tr key={index}>
                <td>{ticket.userName}</td>
                <td>{ticket.closedTickets}</td>
                <td>{ticket.openTickets}</td>
                <td>{ticket.totalTasks}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" style={{ textAlign: "center" }}>
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination Controls */}
      <div className="pagination">
        {Array.from({ length: totalPages }, (_, index) => (
          <button
            key={index + 1}
            onClick={() => setCurrentPage(index + 1)}
            className={currentPage === index + 1 ? "active" : ""}
          >
            {index + 1}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
