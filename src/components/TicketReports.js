import React, { useState, useEffect } from "react";
import {
  fetchTicketStats,
  fetchGroups,
  fetchTicketsByUserId,
} from "../services/glpiService";
import "./TicketReports.css";

const TicketReports = () => {
  const [tickets, setTickets] = useState([]);
  const [teams, setTeams] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: "id", direction: "asc" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTicketsAndTeams = async () => {
      try {
        const ticketsData = await fetchTicketsByUserId(); // Fetch tickets
        const groupData = await fetchGroups(); // Fetch groups for teams

        // Create a map for team names based on user IDs
        const teamMap = {};
        groupData.items.forEach((group) => {
          group.group_users.forEach((user) => {
            teamMap[user.user.id] = group.name;
          });
        });

        setTickets(ticketsData);
        setTeams(teamMap);
        setLoading(false);
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
    return ticketUsers
      .map((user) => `${user.user.first_name} ${user.user.last_name}`)
      .join(", ");
  };

  const getTeam = (userId) => {
    return teams[userId] || "N/A";
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="ticket-reports">
      <h1>Ticket Reports</h1>
      <table>
        <thead>
          <tr>
            <th onClick={() => handleSort("id")}>Ticket#</th>
            <th onClick={() => handleSort("name")}>Title</th>
            <th onClick={() => handleSort("team")}>Team</th>
            <th onClick={() => handleSort("assignedTo")}>Assigned To</th>
            <th onClick={() => handleSort("date")}>Date Created</th>
            <th onClick={() => handleSort("solve_date")}>Date of Last Entry</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr key={ticket.id}>
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
    </div>
  );
};

export default TicketReports;
