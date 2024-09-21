import axios from "axios";

const API_URL = "http://trg-itsm.1914inc.net:8080";

// Set token dynamically after login
export const setAuthToken = (token) => {
  axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
};

// Fetch groups
export const fetchGroups = async (entityId = null, page = 1, size = 50) => {
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

// Fetch tickets by user ID with pagination support
export const fetchTicketsByUserId = async (userId, page = 1, size = 50) => {
  try {
    const response = await axios.get(`${API_URL}/ticket/`, {
      params: { user_id: userId, page, size },
    });

    if (response.status !== 200) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return response.data.items || [];
  } catch (error) {
    console.error("Error fetching tickets by user ID:", error);
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
