// src/index.js
import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { UserProvider } from "./UserContext"; // Import UserProvider

ReactDOM.render(
  <UserProvider>
    <BrowserRouter>
      {" "}
      {/* Wrap App in BrowserRouter */}
      <App />
    </BrowserRouter>
  </UserProvider>,
  document.getElementById("root")
);
