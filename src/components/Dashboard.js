import React, { useState } from "react";
import "./Dashboard.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { setAuthToken } from "../services/glpiService";

const Dashboard = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

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

      console.log("Login Response:", response.data);

      const authToken = response.data.access_token;
      if (authToken) {
        setAuthToken(authToken);
        setIsLoggedIn(true);
      } else {
        setError("Login failed. No token received.");
      }
    } catch (error) {
      setError("Login failed. Please check your credentials.");
      console.error("Login error:", error);
    }
  };

  return (
    <div className="dashboard">
      <h1>GLPI Reports</h1>
      <div className="quick-actions">
        <div
          className="action-card"
          onClick={() => navigate("/weekly-reports")}
        >
          <div className="action-icon">
            <i className="fas fa-chart-line"></i>
          </div>
          <div className="action-content">
            <h3>Weekly Reports</h3>
          </div>
        </div>
        <div className="action-card" onClick={() => navigate("/par-reports")}>
          <div className="action-icon">
            <i className="fas fa-file-alt"></i>
          </div>
          <div className="action-content">
            <h3>PAR Reports</h3>
          </div>
        </div>
      </div>

      {/* Only show login form when not logged in */}
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
