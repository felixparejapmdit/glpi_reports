import axios from "axios";

const API_URL = "http://trg-itsm.1914inc.net:8080";

// Set token dynamically after login
export const setAuthToken = (token) => {
  axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
};

// Fetch groups
export const fetchGroups = async (entityId = null, page = 1, size = 100) => {
  try {
    const params = entityId
      ? { entity_id: entityId, page, size }
      : { page, size };
    const response = await axios.get(`${API_URL}/group/`, { params });
    if (response.status === 200) {
      return response.data;
    } else {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error fetching groups:", error);
    return { items: [] }; // Return empty array if there's an error
  }
};

// Fetch all tickets by user ID with assignment type
export const fetchTicketsByUserId = async (userId, assignmentType = 2) => {
  let allTickets = [];
  let page = 1;
  let size = 50; // Default size per page, you can adjust as needed

  try {
    while (true) {
      const response = await axios.get(`${API_URL}/ticket/`, {
        params: {
          user_id: userId,
          assignment_type: assignmentType,
          page,
          size,
        },
      });

      if (response.status !== 200) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const tickets = response.data.items || [];
      allTickets = [...allTickets, ...tickets]; // Append tickets from the current page

      // Break the loop if we have retrieved all available tickets
      if (tickets.length < size) {
        break;
      }

      // Move to the next page
      page++;
    }

    return allTickets;
  } catch (error) {
    console.error("Error fetching tickets by user ID:", error);
    return [];
  }
};

// Fetch all tickets
export const fetchTickets = async (page = 1, size = 50) => {
  let allTickets = [];
  try {
    while (true) {
      const response = await axios.get(`${API_URL}/ticket/`, {
        params: {
          page,
          size,
        },
      });

      if (response.status !== 200) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const tickets = response.data.items || [];
      allTickets = [...allTickets, ...tickets];

      if (tickets.length < size) {
        break;
      }

      page++;
    }

    return allTickets;
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return [];
  }
};

export const fetchTicketsWithTasks = async (ticketId) => {
  try {
    const response = await axios.get(`${API_URL}/ticketwithtasks/${ticketId}`);
    const ticket = response.data; // Assuming response.data contains the ticket details

    console.log("API Response:", response); // Debug the full response

    // Check if the response contains the necessary fields
    if (!ticket || !ticket.id) {
      console.error("No ticket data found:", ticket); // Log for debugging
      throw new Error("No ticket data found.");
    }

    // Check if the ticket has tasks, if not, default to an empty array
    ticket.ticket_tasks = ticket.ticket_tasks || [];

    return ticket;
  } catch (error) {
    console.error("Error fetching ticket with tasks:", error);
    throw error;
  }
};

// Fetch all ticket tasks by user ID
export const fetchTicketTasksByUserId = async (userId) => {
  let allTasks = [];
  let page = 1;
  let size = 50; // Default size per page, you can adjust as needed

  try {
    while (true) {
      const response = await axios.get(`${API_URL}/tickettask/`, {
        params: {
          user_id: userId,
          page,
          size,
        },
      });

      if (response.status !== 200) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const tasks = response.data.items || [];
      allTasks = [...allTasks, ...tasks]; // Append tasks from the current page

      // Break the loop if we have retrieved all available tasks
      if (tasks.length < size) {
        break;
      }

      // Move to the next page
      page++;
    }

    return allTasks;
  } catch (error) {
    console.error("Error fetching ticket tasks by user ID:", error);
    return [];
  }
};

// Fetch all tasks by user ID
export const fetchUserTasks = async (userId) => {
  let allTasks = [];
  let page = 1;
  let size = 50; // Default size per page, you can adjust as needed

  try {
    while (true) {
      const response = await axios.get(`${API_URL}/tickettask/`, {
        params: { user_id: userId, page, size },
      });

      if (response.status !== 200) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const tasks = response.data.items || [];
      allTasks = [...allTasks, ...tasks]; // Append tasks from the current page

      // Break the loop if we have retrieved all available tasks
      if (tasks.length < size) {
        break;
      }

      // Move to the next page
      page++;
    }

    return allTasks;
  } catch (error) {
    console.error("Error fetching user tasks:", error);
    return [];
  }
};

// Fetch a single user by ID
export const fetchUser = async (userId) => {
  try {
    const response = await axios.get(`${API_URL}/user/${userId}`);

    if (response.status !== 200) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return response.data;
  } catch (error) {
    console.error("Error fetching user:", error);
    return { name: "Unknown User" };
  }
};

// Fetch ticket statistics for different status types
export const fetchTicketStats = async (assignmentType = 2) => {
  try {
    let allTickets = [];
    let page = 1;
    const size = 50; // Set the page size

    // Fetch all pages of tickets
    while (true) {
      const response = await axios.get(`${API_URL}/ticket/`, {
        params: {
          assignment_type: assignmentType,
          page,
          size,
        },
      });

      // Check if the response is structured correctly and contains tickets in the `items` array
      const tickets = response.data.items;

      // If no tickets are found, break the loop
      if (!tickets || tickets.length === 0) {
        break;
      }

      // Append tickets from the current page
      allTickets = [...allTickets, ...tickets];

      // Stop if the total number of pages is reached
      if (tickets.length < size) {
        break;
      }

      page++; // Move to the next page
    }

    // Now filter the tickets based on the status
    const ticketStats = {
      new: allTickets.filter((ticket) => ticket.status === 1).length, // New tickets
      assigned: allTickets.filter((ticket) => ticket.status === 2).length, // Assigned tickets
      planned: allTickets.filter((ticket) => ticket.status === 3).length, // Planned tickets
      pending: allTickets.filter((ticket) => ticket.status === 4).length, // Pending tickets
      solved: allTickets.filter((ticket) => ticket.status === 5).length, // Solved tickets
      closed: allTickets.filter((ticket) => ticket.status === 6).length, // Closed tickets
      notSolved: allTickets.filter((ticket) =>
        [2, 3, 4].includes(ticket.status)
      ).length, // Not Solved (Assigned + Planned + Pending)
      total: allTickets.length, // Total tickets
    };

    return ticketStats;
  } catch (error) {
    console.error("Error fetching ticket stats:", error);
    throw error;
  }
};
