import React, { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";
import Chart from "chart.js/auto";

const App = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [filterTeam, setFilterTeam] = useState("All");
  const [filterTime, setFilterTime] = useState("All");
  const [filterSpecificTime, setFilterSpecificTime] = useState("");
  const chartRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15; // Pagination page size

  // Function to get the current year
  const getCurrentYear = () => new Date().getFullYear();

  // Function to get weeks in the current year
  const getWeeksInYear = () => {
    const weeks = [];
    for (let i = 1; i <= 52; i++) {
      weeks.push(`Week ${i}`);
    }
    return weeks;
  };

  // Function to get months in a year
  const getMonthsInYear = () => [
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
  ];

  // Function to get years (current year to 10 years ago)
  const getYearsRange = () => {
    const currentYear = getCurrentYear();
    const years = [];
    for (let i = 0; i <= 10; i++) {
      years.push(currentYear - i);
    }
    return years;
  };

  useEffect(() => {
    fetch("/data.json")
      .then((response) => response.json())
      .then((jsonData) => {
        setData(jsonData);
        setFilteredData(jsonData); // Show all data by default
      })
      .catch((error) => console.error("Error loading data:", error));
  }, []);

  const handleSorting = (column) => {
    const sortedData = [...filteredData].sort((a, b) => {
      if (column === "name") {
        return a.name.localeCompare(b.name);
      } else if (
        column === "openTickets" ||
        column === "closedTickets" ||
        column === "totalTasks"
      ) {
        return b[column] - a[column]; // Numeric sorting
      } else if (column === "lastUpdate") {
        return new Date(b.lastUpdate) - new Date(a.lastUpdate); // Date sorting
      }
      return 0;
    });
    setFilteredData(sortedData);
  };

  // Pagination logic
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);
  const totalPages = Math.ceil(filteredData.length / pageSize);

  // Function to filter data based on selected team and time range
  const filterData = useCallback(() => {
    const now = new Date();
    let filtered = [];

    data.forEach((team) => {
      if (filterTeam === "All" || team.team === filterTeam) {
        team.members.forEach((member) => {
          const taskDate = new Date(member.lastUpdate);

          switch (filterTime) {
            case "weekly":
              if (filterSpecificTime.includes("Week")) {
                const weekNumber = filterSpecificTime.split(" ")[1];
                const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
                const currentWeek = Math.floor(
                  (taskDate - firstDayOfYear) / (1000 * 60 * 60 * 24 * 7)
                );
                if (currentWeek === parseInt(weekNumber, 10)) {
                  filtered.push(member);
                }
              }
              break;
            case "monthly":
              if (
                taskDate.getMonth() ===
                getMonthsInYear().indexOf(filterSpecificTime)
              ) {
                filtered.push(member);
              }
              break;
            case "yearly":
              if (taskDate.getFullYear() === parseInt(filterSpecificTime, 10)) {
                filtered.push(member);
              }
              break;
            case "All":
              filtered.push(member);
              break;
            default:
              break;
          }
        });
      }
    });

    setFilteredData(filtered);
  }, [data, filterTeam, filterTime, filterSpecificTime]);

  useEffect(() => {
    if (data.length > 0) filterData();
  }, [filterTeam, filterTime, filterSpecificTime, data, filterData]);

  // Handle chart rendering
  useEffect(() => {
    if (filteredData.length > 0) {
      const ctx = document.getElementById("reportChart").getContext("2d");

      if (chartRef.current) {
        chartRef.current.destroy();
      }

      chartRef.current = new Chart(ctx, {
        type: "bar",
        data: {
          labels: filteredData.map((member) => member.name),
          datasets: [
            {
              label: "Open Tickets",
              data: filteredData.map((member) => member.openTickets),
              backgroundColor: "rgba(255, 99, 132, 0.6)",
            },
            {
              label: "Closed Tickets",
              data: filteredData.map((member) => member.closedTickets),
              backgroundColor: "rgba(54, 162, 235, 0.6)",
            },
          ],
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      });
    }
  }, [filteredData]);

  return (
    <div className="app-container">
      <h1>GLPI Reports</h1>

      {/* Filter by Team */}
      <div className="filter-container">
        <label htmlFor="team-filter">Team: </label>
        <select
          id="team-filter"
          value={filterTeam}
          onChange={(e) => setFilterTeam(e.target.value)}
        >
          <option value="All">All</option>
          {data.map((team, index) => (
            <option key={index} value={team.team}>
              {team.team}
            </option>
          ))}
        </select>
      </div>

      {/* Filter by Time (Weekly, Monthly, Yearly, All) */}
      <div className="filter-container">
        <label htmlFor="time-filter">Filter by: </label>
        <select
          id="time-filter"
          value={filterTime}
          onChange={(e) => {
            setFilterTime(e.target.value);
            setFilterSpecificTime(""); // Reset specific time filter
          }}
        >
          <option value="All">All</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>

        {filterTime === "weekly" && (
          <select
            id="week-filter"
            value={filterSpecificTime}
            onChange={(e) => setFilterSpecificTime(e.target.value)}
          >
            {getWeeksInYear().map((week, index) => (
              <option key={index} value={week}>
                {week}
              </option>
            ))}
          </select>
        )}

        {filterTime === "monthly" && (
          <select
            id="month-filter"
            value={filterSpecificTime}
            onChange={(e) => setFilterSpecificTime(e.target.value)}
          >
            {getMonthsInYear().map((month, index) => (
              <option key={index} value={month}>
                {month}
              </option>
            ))}
          </select>
        )}

        {filterTime === "yearly" && (
          <select
            id="year-filter"
            value={filterSpecificTime}
            onChange={(e) => setFilterSpecificTime(e.target.value)}
          >
            {getYearsRange().map((year, index) => (
              <option key={index} value={year}>
                {year}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Displaying Table */}
      <table className="report-table">
        <thead>
          <tr>
            <th onClick={() => handleSorting("name")}>Member</th>
            <th onClick={() => handleSorting("openTickets")}>Open Tickets</th>
            <th onClick={() => handleSorting("closedTickets")}>
              Closed Tickets
            </th>
            <th onClick={() => handleSorting("totalTasks")}>Total Tasks</th>
            <th onClick={() => handleSorting("lastUpdate")}>Last Update</th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((member, index) => (
            <tr key={index} className="table-row">
              <td>{member.name}</td>
              <td>{member.openTickets}</td>
              <td>{member.closedTickets}</td>
              <td>{member.totalTasks}</td>
              <td>{member.lastUpdate}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination Controls */}
      <div className="pagination">
        {Array.from({ length: totalPages }, (_, index) => (
          <button
            key={index + 1}
            onClick={() => setCurrentPage(index + 1)}
            className={currentPage === index + 1 ? "active" : ""}
          >
            {index + 1}
          </button>
        ))}
      </div>

      {/* Placeholder for chart */}
      <div className="chart-container">
        <canvas id="reportChart"></canvas>
      </div>
    </div>
  );
};

export default App;
