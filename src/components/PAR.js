import React, { useState, useEffect } from "react";
import {
  fetchGroups,
  fetchTicketsByUserId,
  fetchTicketTasksByUserId,
} from "../services/glpiService";
import "./PAR.css";
import DOMPurify from "dompurify";

const PAR = () => {
  const [groups, setGroups] = useState([]);
  const [userStats, setUserStats] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [weekNumber, setWeekNumber] = useState(1);
  const [month, setMonth] = useState("January");
  const [year, setYear] = useState("2023");
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Fetch initial data for groups
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const responseGroups = await fetchGroups(26);
        setGroups(responseGroups.items || []);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err);
      }
    };

    loadInitialData();
  }, []);

  // Fetch user stats (tickets and tasks) when group is selected and apply filter
  const fetchUserStats = async (groupId, filterCriteria = {}) => {
    try {
      const responseGroups = await fetchGroups(26);
      const group = responseGroups.items.find(
        (g) => g.id === parseInt(groupId)
      );
      if (!group || !group.group_users) return;

      const users = group.group_users.map((groupUser) => ({
        id: groupUser.user.id,
        name: `${groupUser.user.first_name} ${groupUser.user.last_name}`,
        totalManHours: 0,
        tickets: [],
        tasks: [],
      }));

      // Efficient fetching of user tickets and tasks using Promise.all
      const updatedUsers = await Promise.all(
        users.map(async (user) => {
          const [userTickets, userTasks] = await Promise.all([
            fetchTicketsByUserId(user.id),
            fetchTicketTasksByUserId(user.id),
          ]);

          // Filter the tickets by the selected filter (Date, Weekly, Monthly, Yearly)
          const filteredTickets = applyFilter(userTickets, filterCriteria);

          user.tickets = filteredTickets;
          user.tasks = userTasks;

          // Calculate total man hours from tickets and tasks
          const totalTicketHours = filteredTickets.reduce((acc, ticket) => {
            if (
              ticket.additional_field?.start_time &&
              ticket.additional_field?.end_time
            ) {
              const duration = calculateDuration(
                ticket.additional_field.start_time,
                ticket.additional_field.end_time
              );
              return acc + duration;
            }
            return acc;
          }, 0);

          const totalTaskHours = userTasks.reduce(
            (acc, task) => acc + task.duration_hr,
            0
          );

          return { ...user, totalManHours: totalTicketHours + totalTaskHours };
        })
      );

      setUserStats(updatedUsers);
      setCurrentPage(1); // Reset to the first page after data fetch
    } catch (err) {
      console.error("Error fetching user stats:", err);
      setError(err);
    }
  };

  // Apply filtering logic based on filterType
  const applyFilter = (tickets, filterCriteria) => {
    const { startDate, endDate, weekNumber, month, year } = filterCriteria;
    const now = new Date();

    if (filterType === "Date" && startDate && endDate) {
      return tickets.filter((ticket) => {
        const ticketDate = new Date(ticket.open_date);
        return (
          ticketDate >= new Date(startDate) && ticketDate <= new Date(endDate)
        );
      });
    } else if (filterType === "Weekly") {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const weekStartDate = new Date(yearStart.setDate(weekNumber * 7));
      const weekEndDate = new Date(
        weekStartDate.getTime() + 6 * 24 * 60 * 60 * 1000
      );
      return tickets.filter((ticket) => {
        const ticketDate = new Date(ticket.open_date);
        return ticketDate >= weekStartDate && ticketDate <= weekEndDate;
      });
    } else if (filterType === "Monthly") {
      const monthIndex = new Date(
        `${month} 1, ${now.getFullYear()}`
      ).getMonth();
      return tickets.filter((ticket) => {
        const ticketDate = new Date(ticket.open_date);
        return (
          ticketDate.getMonth() === monthIndex &&
          ticketDate.getFullYear() === now.getFullYear()
        );
      });
    } else if (filterType === "Yearly") {
      return tickets.filter((ticket) => {
        const ticketDate = new Date(ticket.open_date);
        return ticketDate.getFullYear() === parseInt(year);
      });
    }
    // Default filter (All)
    return tickets;
  };

  // Calculate duration of tickets
  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 0;
    const start = new Date(startTime);
    const end = new Date(endTime);
    return (end - start) / (1000 * 60 * 60); // Convert to hours
  };

  // Pagination logic: Calculate paginated user stats for the current page
  const paginatedUserStats = userStats.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Calculate the total number of pages
  const totalPages = Math.ceil(userStats.length / pageSize);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  // Function to strip HTML tags and decode HTML entities
  const stripHtmlTags = (html) => {
    const cleanHtml = DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true },
    });
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = cleanHtml;

    // Extract text from the element, which decodes the entities
    const decodedText = tempDiv.textContent || tempDiv.innerText || "";

    return decodedText.replace(/<\/?[^>]+(>|$)/g, "");
  };

  // Function to get tasks related to a specific ticket and decode HTML entities
  const getTasksForTicket = (ticketId, tasks) => {
    const relatedTasks = tasks.filter((task) => task.ticket_id === ticketId);
    return relatedTasks.length > 0
      ? relatedTasks.map((task, taskIndex) => (
          <div key={taskIndex}>{stripHtmlTags(task.content) || "-"}</div>
        ))
      : "-";
  };

  // Function to get man hours for tickets or tasks
  const getManHoursForTicketOrTask = (ticket, tasks) => {
    const relatedTasks = tasks.filter((task) => task.ticket_id === ticket.id);
    if (relatedTasks.length > 0) {
      return (
        relatedTasks
          .reduce((acc, task) => acc + task.duration_hr, 0)
          .toFixed(2) + " hours"
      );
    } else {
      const duration = calculateDuration(
        ticket.additional_field?.start_time,
        ticket.additional_field?.end_time
      );
      return duration.toFixed(2) + " hours";
    }
  };

  const renderFilterFields = () => {
    if (filterType === "Date") {
      return (
        <>
          <label htmlFor="start-date">Start Date:</label>
          <input
            type="date"
            id="start-date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              fetchUserStats(selectedGroup, {
                startDate: e.target.value,
                endDate,
              });
            }}
          />

          <label htmlFor="end-date">End Date:</label>
          <input
            type="date"
            id="end-date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              fetchUserStats(selectedGroup, {
                startDate,
                endDate: e.target.value,
              });
            }}
          />
        </>
      );
    } else if (filterType === "Weekly") {
      return (
        <>
          <label htmlFor="week-number">Week Number:</label>
          <select
            id="week-number"
            value={weekNumber}
            onChange={(e) => {
              setWeekNumber(e.target.value);
              fetchUserStats(selectedGroup, { weekNumber: e.target.value });
            }}
          >
            {Array.from({ length: 52 }, (_, i) => i + 1).map((week) => (
              <option key={week} value={week}>
                Week {week}
              </option>
            ))}
          </select>
        </>
      );
    } else if (filterType === "Monthly") {
      return (
        <>
          <label htmlFor="month-select">Month:</label>
          <select
            id="month-select"
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              fetchUserStats(selectedGroup, { month: e.target.value });
            }}
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
            ].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </>
      );
    } else if (filterType === "Yearly") {
      return (
        <>
          <label htmlFor="year-select">Year:</label>
          <select
            id="year-select"
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              fetchUserStats(selectedGroup, { year: e.target.value });
            }}
          >
            {["2023", "2024", "2025", "2026", "2027", "2028", "2029"].map(
              (y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              )
            )}
          </select>
        </>
      );
    }
    return null;
  };

  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="dashboard">
      <h1>Post Activity Report</h1>

      <div className="user-stats">
        <div className="filterby">
          <label htmlFor="group-select">Select team:</label>
          <select
            id="group-select"
            onChange={(e) => {
              setSelectedGroup(e.target.value);
              fetchUserStats(e.target.value);
            }}
            value={selectedGroup}
          >
            <option value="" disabled>
              Select a team
            </option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>

          <label htmlFor="filter-type">Filter By:</label>
          <select
            id="filter-type"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="All">All</option>
            <option value="Date">Date</option>
            <option value="Weekly">Weekly</option>
            <option value="Monthly">Monthly</option>
            <option value="Yearly">Yearly</option>
          </select>

          {renderFilterFields()}
        </div>

        {selectedGroup && (
          <div className="user-details">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fullname</th>
                  <th>Tickets</th>
                  <th>Tasks</th>
                  <th>Man Hours</th>
                  <th>Total Man Hours</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUserStats.map((user, index) => (
                  <React.Fragment key={index}>
                    {user.tickets.map((ticket, ticketIndex) => (
                      <tr key={ticketIndex}>
                        {ticketIndex === 0 && (
                          <>
                            <td rowSpan={user.tickets.length}>
                              {(currentPage - 1) * pageSize + index + 1}
                            </td>
                            <td rowSpan={user.tickets.length}>{user.name}</td>
                          </>
                        )}
                        <td>{ticket.name}</td>
                        <td>{getTasksForTicket(ticket.id, user.tasks)}</td>
                        <td>
                          {getManHoursForTicketOrTask(ticket, user.tasks)}
                        </td>
                        {ticketIndex === 0 && (
                          <td rowSpan={user.tickets.length}>
                            {user.totalManHours.toFixed(2)} hours
                          </td>
                        )}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="pagination">
              <button onClick={handlePrevPage} disabled={currentPage === 1}>
                Previous
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PAR;
