import React, { useState, useEffect, useRef } from "react";
import {
  fetchTickets,
  fetchTicketsWithTasks,
  fetchGroups,
} from "../services/glpiService";
import "./TicketReports.css";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import he from "he";

// Helper function to decode and strip HTML tags
const decodeHtml = (html) => {
  const decodedString = he.decode(html);
  const parser = new DOMParser();
  const doc = parser.parseFromString(decodedString, "text/html");
  return doc.body.textContent || "";
};

// Helper function to merge and remove duplicate assigned names
const mergeAssignedNames = (ticketUsers) => {
  const uniqueUsers = new Set(
    ticketUsers.map((user) => `${user.user.first_name} ${user.user.last_name}`)
  );
  return [...uniqueUsers].join(", ");
};

const TicketReports = () => {
  const [tickets, setTickets] = useState([]);
  const [teams, setTeams] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: "id", direction: "asc" });
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loadingTicketTasks, setLoadingTicketTasks] = useState(false);
  const pageSize = 15;

  // Reference to the panel element
  const panelRef = useRef(null);

  useEffect(() => {
    const fetchTicketsAndTeams = async () => {
      try {
        setLoadingProgress(20);
        const ticketsData = await fetchTickets();
        setLoadingProgress(50);

        const groupData = await fetchGroups(26);
        setLoadingProgress(80);

        const teamMap = {};
        groupData.items.forEach((group) => {
          group.group_users.forEach((user) => {
            teamMap[user.user.id] = group.name;
          });
        });

        setTickets(ticketsData);
        setTeams(teamMap);
        setLoadingProgress(100);
        setTimeout(() => setLoading(false), 300);
      } catch (error) {
        console.error("Error fetching ticket or group data:", error);
        setLoading(false);
      }
    };

    fetchTicketsAndTeams();
  }, []);

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
    sortTickets(key, direction);
  };

  const sortTickets = (key, direction) => {
    const sortedTickets = [...tickets].sort((a, b) => {
      if (a[key] < b[key]) {
        return direction === "asc" ? -1 : 1;
      }
      if (a[key] > b[key]) {
        return direction === "asc" ? 1 : -1;
      }
      return 0;
    });
    setTickets(sortedTickets);
  };

  const getAssignedTo = (ticketUsers) => {
    if (!ticketUsers || ticketUsers.length === 0) {
      return "Unassigned";
    }

    return mergeAssignedNames(ticketUsers);
  };

  const getTeam = (userId) => {
    return teams[userId] || "N/A";
  };

  const handleRowClick = async (ticket) => {
    setLoadingTicketTasks(true);
    try {
      const ticketWithTasks = await fetchTicketsWithTasks(ticket.id);
      setSelectedTicket(ticketWithTasks);
    } catch (error) {
      console.error("Error fetching ticket tasks:", error);
    } finally {
      setLoadingTicketTasks(false);
    }
  };

  const closePanel = () => {
    setSelectedTicket(null);
  };

  // Detect clicks outside the panel and close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        closePanel();
      }
    };

    if (selectedTicket) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedTicket]);

  const statusMap = {
    1: "New",
    2: "Processing (Assigned)",
    3: "Processing (Planned)",
    4: "Pending",
    5: "Solved",
    6: "Closed",
  };

  const getStatus = (statusCode) => statusMap[statusCode] || "Unknown Status";

  const getTotalHours = (ticket) => {
    const duration = ticket.duration || 0;
    const startTime = new Date(ticket.additional_field?.start_time).getTime();
    const endTime = new Date(ticket.additional_field?.end_time).getTime();
    const additionalHours = (endTime - startTime) / (1000 * 60 * 60);
    const totalHours = duration + additionalHours;
    return isNaN(totalHours) ? "0.00" : totalHours.toFixed(2);
  };

  const filteredTickets = tickets.filter((ticket) => {
    const assignedToNames = getAssignedTo(ticket.ticket_users);
    const teamName = getTeam(ticket.ticket_users[0]?.user?.id);

    return (
      ticket.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignedToNames.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.id.toString().includes(searchTerm) ||
      new Date(ticket.date).toLocaleDateString().includes(searchTerm) ||
      (ticket.solve_date &&
        new Date(ticket.solve_date).toLocaleDateString().includes(searchTerm))
    );
  });

  const totalPages = Math.ceil(filteredTickets.length / pageSize);
  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };
  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="progress-bar-wrapper">
          <CircularProgressbar
            value={loadingProgress}
            text={`${loadingProgress}%`}
            styles={buildStyles({
              textColor: "#333",
              pathColor: "#007bff",
              trailColor: "#eee",
            })}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="ticket-reports">
      <h1>Ticket Reports</h1>

      <div className="search-container">
        <input
          type="text"
          placeholder="Search tickets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="pagination">
        <button onClick={handlePrevPage} disabled={currentPage === 1}>
          Previous
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button onClick={handleNextPage} disabled={currentPage === totalPages}>
          Next
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th onClick={() => handleSort("id")}>Ticket#</th>
            <th onClick={() => handleSort("name")}>Title</th>
            <th onClick={() => handleSort("team")}>Team</th>
            <th onClick={() => handleSort("assignedTo")}>Assigned To</th>
            <th onClick={() => handleSort("date")}>Date Created</th>
            <th onClick={() => handleSort("solve_date")}>Date of Last Entry</th>
          </tr>
        </thead>
        <tbody>
          {paginatedTickets.map((ticket, index) => (
            <tr key={ticket.id} onClick={() => handleRowClick(ticket)}>
              <td>{(currentPage - 1) * pageSize + index + 1}</td>
              <td>{ticket.id}</td>
              <td>{ticket.name}</td>
              <td>{getTeam(ticket.ticket_users[0]?.user?.id)}</td>
              <td>{getAssignedTo(ticket.ticket_users)}</td>
              <td>{new Date(ticket.date).toLocaleDateString()}</td>
              <td>
                {ticket.solve_date
                  ? new Date(ticket.solve_date).toLocaleDateString()
                  : "N/A"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedTicket && (
        <div
          className={`slide-in-panel ${selectedTicket ? "open" : ""}`}
          ref={panelRef}
        >
          <div className="panel-content">
            <h3>Ticket Summary</h3>

            <p>
              <strong>Title:</strong>{" "}
              <strong style={{ color: "#333" }}>{selectedTicket.name}</strong>
            </p>
            <p>
              <strong>Status:</strong> {getStatus(selectedTicket.status)}
            </p>
            <p>
              <strong>Assigned:</strong>{" "}
              {mergeAssignedNames(selectedTicket.ticket_users)}
            </p>
            <p>
              <strong>Date Created:</strong>{" "}
              {new Date(selectedTicket.date).toLocaleDateString()}
            </p>
            <p>
              <strong>Total Hours:</strong> {getTotalHours(selectedTicket)}
            </p>

            <h3>Tasks</h3>
            {selectedTicket.ticket_tasks &&
            selectedTicket.ticket_tasks.length > 0 ? (
              selectedTicket.ticket_tasks.map((task) => (
                <div key={task.id} className="task-card">
                  <div className="task-image">
                    <img src="https://via.placeholder.com/150" alt="Task" />
                  </div>
                  <div className="task-details">
                    <p>
                      <strong>Task:</strong>{" "}
                      <strong style={{ color: "#333" }}>
                        {decodeHtml(task.content) || "N/A"}
                      </strong>
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
                      <strong>Additional Details:</strong>{" "}
                      {task.additional_details || "N/A"}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p>No tasks available for this ticket.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketReports;
