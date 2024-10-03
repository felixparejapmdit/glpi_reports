import React, { useState, useEffect } from "react";
import { fetchGroups, fetchTicketsByUserId } from "../services/glpiService";
import "./WeeklyReports.css";

function WeeklyReports() {
  const [teams, setTeams] = useState([]);
  const [groupUsers, setGroupUsers] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [filterTeam, setFilterTeam] = useState("All");
  const [filterTime, setFilterTime] = useState("All");
  const [filterSpecificTime, setFilterSpecificTime] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Fetch teams on component mount
  useEffect(() => {
    const loadTeams = async () => {
      try {
        const response = await fetchGroups();
        setTeams(response.items ? response.items : []); // Add null check
      } catch (error) {
        console.error("Error loading teams:", error);
      }
    };
    loadTeams();
  }, []);

  // Fetch users when the team is selected
  const loadTeamUsers = async (teamId) => {
    try {
      const selectedTeam = teams.find((team) => team.id === parseInt(teamId));
      if (selectedTeam) {
        const users = selectedTeam.group_users.map((user) => ({
          fullName: `${user.user.first_name} ${user.user.last_name}`,
          userId: user.user.id,
          closedTickets: 0, // Placeholder for closed tickets
          openTickets: 0, // Placeholder for open tickets
          totalTasks: 0, // Placeholder for total tasks
        }));

        // Fetch tickets for each user
        const userTicketsPromises = users.map((user) =>
          fetchTicketsByUserId(user.userId)
        );
        const userTickets = await Promise.all(userTicketsPromises);

        // Calculate closed and open tickets for each user
        users.forEach((user, index) => {
          const tickets = userTickets[index];
          user.closedTickets = tickets.filter(
            (ticket) => ticket.status === 6
          ).length;
          user.openTickets = tickets.filter(
            (ticket) => ticket.status !== 6
          ).length;
        });

        setGroupUsers(users);
      } else {
        setGroupUsers([]);
      }
    } catch (error) {
      console.error("Error fetching group users:", error);
    }
  };

  // Handle filtering data by team and time range
  const filterData = async () => {
    let filtered = groupUsers;

    if (filterTeam !== "All") {
      await loadTeamUsers(filterTeam);
      filtered = groupUsers;
    }

    // Filter by time (weekly, monthly, yearly)
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
    filterData();
  }, [filterTeam, filterTime, filterSpecificTime, teams]);

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);
  const totalPages = Math.ceil(filteredData.length / pageSize);

  return (
    <div className="weekly-reports-container">
      <h1 className="reports-header">Weekly Reports</h1>

      <div className="quick-actions1">
        <button className="action-button">Generate Report</button>
        <button className="action-button">Download PDF</button>
        <button className="action-button">Export to CSV</button>
      </div>

      {/* Filter by Team */}
      <div className="filter-section">
        <div className="filter-container">
          <label htmlFor="team-filter">Team: </label>
          <select
            id="team-filter"
            value={filterTeam}
            onChange={(e) => {
              setFilterTeam(e.target.value);
              loadTeamUsers(e.target.value);
            }}
          >
            <option value="All">All</option>
            {teams.map((team, index) => (
              <option key={index} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter by Time */}
        <div className="filter-container">
          <label htmlFor="time-filter">Filter by: </label>
          <select
            id="time-filter"
            value={filterTime}
            onChange={(e) => {
              setFilterTime(e.target.value);
              setFilterSpecificTime("");
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
      </div>

      {/* Displaying Table */}
      <div className="table-container">
        <table className="report-table">
          <thead>
            <tr>
              <th>Full Name</th>
              <th># of Closed Tickets</th>
              <th># of Open Tickets</th>
              <th># of Tasks</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((user, index) => (
                <tr key={index}>
                  <td>{user.fullName}</td>
                  <td>{user.closedTickets}</td>
                  <td>{user.openTickets}</td>
                  <td>{user.totalTasks}</td>
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
      </div>

      {/* Pagination */}
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
}

export default WeeklyReports;
