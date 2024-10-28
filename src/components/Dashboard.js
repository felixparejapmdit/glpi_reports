import React, { useState, useContext } from "react";
import { UserContext } from "../UserContext"; // Import UserContext
import "./Dashboard.css";
import { fetchTicketStats, setAuthToken } from "../services/glpiService";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faExclamationCircle,
  faUsers,
  faCalendarCheck,
  faPauseCircle,
  faCheckSquare,
  faArchive,
  faChartLine,
  faFileAlt,
  faTicketAlt,
} from "@fortawesome/free-solid-svg-icons";

const Dashboard = () => {
  const { setUsername } = useContext(UserContext); // Destructure setUsername from context
  const [username, setUsernameInput] = useState(""); // Local state for username input
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState(null);
  const [ticketStats, setTicketStats] = useState({
    new: 0,
    assigned: 0,
    planned: 0,
    pending: 0,
    solved: 0,
    closed: 0,
    notSolved: 0,
    total: 0,
  });
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Handle login submission
  const handleLogin = async (event) => {
    event.preventDefault();
    const data = new URLSearchParams();
    data.append("username", username);
    data.append("password", password);

    try {
      setIsLoading(true); // Start loading
      setLoadingProgress(20); // Set initial progress
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

      const authToken = response.data.access_token;
      if (authToken) {
        setAuthToken(authToken);
        setIsLoggedIn(true);
        await fetchTicketData(); // Fetch ticket data after login
      } else {
        setError("Login failed. No token received.");
        setIsLoading(false);
      }
    } catch (error) {
      setError("Login failed. Please check your credentials.");
      setIsLoading(false);
      console.error("Login error:", error);
    }
  };

  // Fetch ticket stats after login
  const fetchTicketData = async () => {
    try {
      setLoadingProgress(40); // Update progress at the start of the fetch
      const stats = await fetchTicketStats();

      if (stats) {
        setTicketStats(stats);
        setLoadingProgress(70); // Update progress after data is fetched
        // Simulate some processing delay for the last step
        setTimeout(() => {
          setLoadingProgress(100); // Set progress to 100% after processing
          setIsLoading(false); // Stop loading
        }, 500); // Adjust the delay as needed
      }
    } catch (error) {
      console.error("Error fetching ticket stats:", error);
      setLoadingProgress(100); // Ensure it reaches 100% even if there's an error
      setIsLoading(false); // Stop loading on error
    }
  };

  // Hide the loading bar when progress reaches 100%
  const loadingBarStyle = {
    display: loadingProgress === 100 ? "none" : "block",
  };

  return (
    <div className="dashboard-content">
      {/* Ticket Stats Section */}
      {isLoggedIn && (
        <>
          {/* Centered GLPI Reports Title */}
          <h1 className="centered-title">Dashboard</h1>

          <div className="main-content">
            <div className="ticket-stats">
              <div className="ticket-card not-solved">
                <FontAwesomeIcon
                  icon={faExclamationCircle}
                  className="ticket-icon"
                />
                <span className="ticket-count">{ticketStats.notSolved}</span>
                <span>Not Solved</span>
              </div>
              <div className="ticket-card assigned">
                <FontAwesomeIcon icon={faUsers} className="ticket-icon" />
                <span className="ticket-count">{ticketStats.assigned}</span>
                <span>Assigned tickets</span>
              </div>
              <div className="ticket-card planned">
                <FontAwesomeIcon
                  icon={faCalendarCheck}
                  className="ticket-icon"
                />
                <span className="ticket-count">{ticketStats.planned}</span>
                <span>Planned tickets</span>
              </div>
              <div className="ticket-card pending">
                <FontAwesomeIcon icon={faPauseCircle} className="ticket-icon" />
                <span className="ticket-count">{ticketStats.pending}</span>
                <span>Pending tickets</span>
              </div>
              <div className="ticket-card solved">
                <FontAwesomeIcon icon={faCheckSquare} className="ticket-icon" />
                <span className="ticket-count">{ticketStats.solved}</span>
                <span>Solved tickets</span>
              </div>
              <div className="ticket-card closed">
                <FontAwesomeIcon icon={faArchive} className="ticket-icon" />
                <span className="ticket-count">{ticketStats.closed}</span>
                <span>Closed tickets</span>
              </div>
              <div className="ticket-card total">
                <FontAwesomeIcon
                  icon={faExclamationCircle}
                  className="ticket-icon"
                />
                <span className="ticket-count">{ticketStats.total}</span>
                <span>Total tickets</span>
              </div>
            </div>

            <div className="quick-actions">
              <h1 className="centered-title">Quick Actions</h1>
              <div
                className="action-card"
                onClick={() => navigate("/weekly-reports")}
              >
                <div className="action-icon">
                  <FontAwesomeIcon icon={faChartLine} />
                </div>
                <div className="action-content">
                  <h3>GLPI Reports</h3>
                </div>
              </div>
              <div
                className="action-card"
                onClick={() => navigate("/par-reports")}
              >
                <div className="action-icon">
                  <FontAwesomeIcon icon={faFileAlt} />
                </div>
                <div className="action-content">
                  <h3>PAR Reports</h3>
                </div>
              </div>

              <div
                className="action-card"
                onClick={() => navigate("/ticket-reports")}
              >
                <div className="action-icon">
                  <FontAwesomeIcon icon={faFileAlt} />
                </div>
                <div className="action-content">
                  <h3>Ticket Reports</h3>
                </div>
              </div>

              <div
                className="action-card"
                onClick={() => navigate("/pv-reports")}
                style={{ display: "none" }} // This will hide the element
              >
                <div className="action-icon">
                  <FontAwesomeIcon icon={faFileAlt} />
                </div>
                <div className="action-content">
                  <h3>PV Reports</h3>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Loading Spinner */}
      {isLoading && (
        <div className="loading-container">
          <div className="loading-bar" style={loadingBarStyle}>
            <CircularProgressbar
              value={loadingProgress}
              text={`${loadingProgress}%`}
              styles={buildStyles({
                textColor: "#fff",
                pathColor: "#00aaff",
                trailColor: "#d6d6d6",
              })}
            />
          </div>
        </div>
      )}

      {/* Login Wrapper */}
      {!isLoggedIn && (
        <div className="login-wrapper">
          <div className="login-container">
            <div className="login-header">
              <i className="fas fa-user-circle user-icon"></i>
              <h2>Sign in</h2>
              <h5>Sign in below using your GLPI credentials</h5>
            </div>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <i className="fas fa-user input-icon"></i>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <label>Username</label>
              </div>
              <div className="form-group">
                <i className="fas fa-lock input-icon"></i>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <label>Password</label>
              </div>
              {error && <p className="error">{error}</p>}
              <button type="submit" className="login-button">
                SIGN IN
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
