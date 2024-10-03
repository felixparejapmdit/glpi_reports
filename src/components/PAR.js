import React, { useState, useEffect } from "react";
import { fetchGroups, fetchTicketsByUserId } from "../services/glpiService";
import "./PAR.css";

const PAR = () => {
  const [groups, setGroups] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [userStats, setUserStats] = useState({});
  const [selectedGroup, setSelectedGroup] = useState(13); // Default group ID
  const [selectedCategory, setSelectedCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);

  // Fetch initial data
  useEffect(() => {
    async function loadData() {
      try {
        console.log("Fetching groups and categories...");
        const responseGroups = await fetchGroups(26); // Replace with your actual entity_id
        const groupData = responseGroups.items || [];
        setGroups(groupData);
        console.log("Groups fetched:", groupData);

        const categoryResponse = await fetch(
          "http://trg-itsm.1914inc.net:8080/itilcategory/?page=1&size=50"
        );
        const categoryData = await categoryResponse.json();
        setCategories(categoryData.items || []);
        console.log("Categories fetched:", categoryData.items);

        const users = {};

        // Process each group and their users
        for (let group of groupData) {
          if (Array.isArray(group.group_users)) {
            for (let groupUser of group.group_users) {
              const userId = groupUser.user.id;
              if (!users[userId]) {
                users[userId] = {
                  name: `${groupUser.user.first_name} ${groupUser.user.last_name}`,
                  totalManHours: 0,
                  groupId: group.id,
                  category: groupUser.user.category,
                };
              }
            }
          }
        }

        // Calculate man-hours for users
        for (const userId in users) {
          const userTickets = await fetchTicketsByUserId(userId);
          const ticketsWithDuration = userTickets.map((ticket) => {
            if (
              ticket.additional_field &&
              ticket.additional_field.start_time &&
              ticket.additional_field.end_time
            ) {
              const duration = calculateDuration(
                ticket.additional_field.start_time,
                ticket.additional_field.end_time
              );
              return { ...ticket, duration };
            }
            return ticket;
          });

          const totalManHours = ticketsWithDuration.reduce(
            (sum, ticket) => sum + (ticket.duration || 0),
            0
          );

          users[userId].totalManHours = totalManHours;
        }

        setUserStats(users);
        console.log("User stats calculated:", users);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleUserClick = async (userId) => {
    setSelectedUserId(userId);
    try {
      const userTickets = await fetchTicketsByUserId(userId);
      const ticketsWithDuration = userTickets.map((ticket) => {
        if (
          ticket.additional_field &&
          ticket.additional_field.start_time &&
          ticket.additional_field.end_time
        ) {
          const duration = calculateDuration(
            ticket.additional_field.start_time,
            ticket.additional_field.end_time
          );
          return { ...ticket, duration };
        }
        return ticket;
      });

      setTickets(ticketsWithDuration);
      console.log("Tickets for user:", ticketsWithDuration);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      setError(error);
    }
  };

  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 0;
    const start = new Date(startTime);
    const end = new Date(endTime);
    return (end - start) / (1000 * 60 * 60); // Convert milliseconds to hours
  };

  const calculateStats = () => {
    let overallTime = 0;
    let overallManHours = 0;

    Object.keys(userStats).forEach((userId) => {
      overallTime += userStats[userId].totalManHours;
      overallManHours += userStats[userId].totalManHours;
    });

    return { overallTime, overallManHours };
  };

  const { overallTime, overallManHours } = calculateStats();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const userStatsData = Object.keys(userStats).map((userId) => ({
    name: userStats[userId].name,
    manHours: userStats[userId].totalManHours.toFixed(2),
  }));

  const groupStatsData = Object.keys(groups).map((groupId) => {
    const groupManHours = Object.keys(userStats).reduce((acc, userId) => {
      if (userStats[userId].groupId === groupId) {
        acc += userStats[userId].totalManHours;
      }
      return acc;
    }, 0);
    return {
      name: groups[groupId].name,
      manHours: groupManHours.toFixed(2),
    };
  });

  return (
    <div className="dashboard">
      <h1>Post Activity Report</h1>

      <div className="searchbar">
        <label htmlFor="category-select">Select Category:</label>
        <select
          id="category-select"
          onChange={(e) => setSelectedCategory(e.target.value)}
          value={selectedCategory}
        >
          <option value="" disabled>
            Select a category
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <label htmlFor="start-date">Start Date:</label>
        <input
          type="date"
          id="start-date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />

        <label htmlFor="end-date">End Date:</label>
        <input
          type="date"
          id="end-date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      <div className="stats">
        <h2>Overall Stats</h2>
        <p>Overall Man Hours: {overallManHours.toFixed(2)} hours</p>
      </div>

      <div className="user-stats">
        <h2>TRG Personnel Stats</h2>

        <label htmlFor="group-select">Select Group:</label>
        <select
          id="group-select"
          onChange={(e) => setSelectedGroup(e.target.value)}
          value={selectedGroup}
        >
          <option value="" disabled>
            Select a group
          </option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>

        {selectedGroup && (
          <div className="user-details">
            {Object.keys(userStats).length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Username/Fullname</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Total Man Hours</th>
                    <th>Category</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(userStats)
                    .filter(
                      (userId) =>
                        userStats[userId].groupId ===
                          parseInt(selectedGroup, 10) &&
                        (selectedCategory === "" ||
                          userStats[userId].category === selectedCategory)
                    )
                    .map((userId) => (
                      <tr
                        key={userId}
                        onClick={() => handleUserClick(userId)}
                        style={{
                          cursor: "pointer",
                          backgroundColor:
                            selectedUserId === userId
                              ? "#f0f0f0"
                              : "transparent",
                        }}
                      >
                        <td>{userStats[userId].name}</td>

                        <td>
                          {new Date(
                            userStats[userId].startDate
                          ).toLocaleDateString()}
                        </td>
                        <td>
                          {new Date(
                            userStats[userId].endDate
                          ).toLocaleDateString()}
                        </td>
                        <td
                          style={{
                            color:
                              userStats[userId].totalManHours.toFixed(2) ===
                              "0.00"
                                ? "red"
                                : "inherit",
                          }}
                        >
                          {userStats[userId].totalManHours.toFixed(2)} hours
                        </td>
                        <td>{userStats[userId].category || "N/A"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            ) : (
              <p>No user stats available.</p>
            )}
          </div>
        )}
      </div>

      <div className="tickets">
        <h2>Tickets</h2>
        {selectedUserId ? (
          tickets.length > 0 ? (
            tickets.map((ticket) => (
              <div key={ticket.id} className="ticket">
                <h3>Ticket #{ticket.id}</h3>
                <p>{ticket.name}</p>
                <p>Duration: {ticket.duration || 0} hours</p>
                <p>Content: {ticket.content}</p>
                <div>
                  {ticket.pictures && ticket.pictures.length > 0 ? (
                    ticket.pictures.map((pic, index) => (
                      <img
                        key={index}
                        src={pic.url}
                        alt={`Ticket ${ticket.id}`}
                      />
                    ))
                  ) : (
                    <p>No pictures available.</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p>No tickets available for this user.</p>
          )
        ) : (
          <p>Select a user to view their tickets.</p>
        )}
      </div>
    </div>
  );
};

export default PAR;
