// src/components/Menubar.js
import React from "react";
import { useNavigate } from "react-router-dom";
import "./menubar.css";
import logo from "../assets/reports_logo.png"; // Add your reports icon here

const Menubar = ({ profileName, onLogout }) => {
  const navigate = useNavigate();

  return (
    <div className="menubar">
      <div className="logo" onClick={() => navigate("/")}>
        <img src={logo} alt="Reports Icon" className="logo-img" />
        <span className="logo-text">Dashboard</span> {/* Branding Name */}
      </div>
      <div className="nav-items">
        <button onClick={() => navigate("/")} className="nav-button">
          Home
        </button>
        <button className="nav-button">About</button>
        <button className="nav-button">Services</button>
        <button className="nav-button">Contact</button>
        <button className="nav-button">Feedback</button>
      </div>
      <div className="profile">
        <span className="profile-name">{profileName}</span>
        <button onClick={onLogout} className="logout-button">
          <i className="fas fa-sign-out-alt"></i>{" "}
          {/* Font Awesome logout icon */}
        </button>
      </div>
    </div>
  );
};

export default Menubar;
