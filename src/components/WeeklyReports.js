import React, { useState, useEffect } from "react";
import {
  fetchGroups,
  fetchTicketsByUserId,
  fetchUserTasks,
} from "../services/glpiService";
import "./WeeklyReports.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileCsv, faFilePdf } from "@fortawesome/free-solid-svg-icons";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Chart, registerables } from "chart.js";
import * as XLSX from "xlsx";

Chart.register(...registerables);

function WeeklyReports() {
  const [teams, setTeams] = useState([]);
  const [groupUsers, setGroupUsers] = useState([]); // Main user data
  const [filteredData, setFilteredData] = useState([]); // Data for userChart and table
  const [filterTeam, setFilterTeam] = useState("All");
  const [filterTime, setFilterTime] = useState("All");
  const [filterSpecificTime, setFilterSpecificTime] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;
  const [chartData, setChartData] = useState(null);
  const [timeChartData, setTimeChartData] = useState(null); // Time chart data

  // Fetch teams on component mount
  useEffect(() => {
    const loadTeams = async () => {
      try {
        const response = await fetchGroups();
        setTeams(response.items ? response.items : []);
      } catch (error) {
        console.error("Error loading teams:", error);
      }
    };
    loadTeams();
  }, []);

  // Fetch users when the team is selected
  const loadTeamUsers = async (teamId) => {
    try {
      const selectedTeam = teams.find((team) => team.id === parseInt(teamId));
      if (selectedTeam) {
        const users = selectedTeam.group_users.map((user) => ({
          fullName: `${user.user.first_name} ${user.user.last_name}`,
          userId: user.user.id,
          closedTickets: 0,
          openTickets: 0,
          totalTickets: 0,
          taskCount: 0,
          tickets: [],
          tasks: [],
        }));

        const userTicketsPromises = users.map((user) =>
          fetchTicketsByUserId(user.userId)
        );
        const userTickets = await Promise.all(userTicketsPromises);

        const userTasksPromises = users.map((user) =>
          fetchUserTasks(user.userId)
        );
        const userTasks = await Promise.all(userTasksPromises);

        users.forEach((user, index) => {
          const tickets = userTickets[index];
          user.closedTickets = tickets.filter(
            (ticket) => ticket.status === 6
          ).length;
          user.openTickets = tickets.filter(
            (ticket) => ticket.status !== 6
          ).length;
          user.totalTickets = user.closedTickets + user.openTickets;
          user.tickets = tickets;
          user.tasks = userTasks[index];
          user.taskCount = user.tasks.length;
        });

        users.sort((a, b) => a.fullName.localeCompare(b.fullName));

        // Set the filtered data for table display
        setFilteredData(users);
        setGroupUsers(users); // Store group data separately for time chart

        // Generate the chart data based on the updated data
        generateChartData(users);
      } else {
        setGroupUsers([]);
        setFilteredData([]);
      }
    } catch (error) {
      console.error("Error fetching group users:", error);
    }
  };

  // Generate user-specific chart data for the user chart
  const generateChartData = (data) => {
    const labels = data.map((user) => user.fullName);
    const closedTicketsData = data.map((user) => user.closedTickets);
    const openTicketsData = data.map((user) => user.openTickets);
    const taskCountData = data.map((user) => user.taskCount);

    setChartData({
      labels,
      datasets: [
        {
          label: "Closed Tickets",
          data: closedTicketsData,
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1,
        },
        {
          label: "Open Tickets",
          data: openTicketsData,
          backgroundColor: "rgba(255, 99, 132, 0.2)",
          borderColor: "rgba(255, 99, 132, 1)",
          borderWidth: 1,
        },
        {
          label: "Tasks",
          data: taskCountData,
          backgroundColor: "rgba(153, 102, 255, 0.2)",
          borderColor: "rgba(153, 102, 255, 1)",
          borderWidth: 1,
        },
      ],
    });
  };

  // Function to generate time-based chart data (tickets and tasks per week/month/year)
  const generateTimeChartData = (data) => {
    let timeLabels, timeDataTickets, timeDataTasks;

    if (filterTime === "weekly") {
      timeLabels = Array.from({ length: 52 }, (_, i) => `Week ${i + 1}`);
      // Aggregate tickets and tasks by week
      timeDataTickets = Array(52).fill(0);
      timeDataTasks = Array(52).fill(0);

      data.forEach((user) => {
        user.tickets.forEach((ticket) => {
          const weekNumber = getWeekOfYear(new Date(ticket.open_date));
          if (ticket.status === 6) {
            timeDataTickets[weekNumber - 1]++;
          }
          user.tasks.forEach((task) => {
            const weekNumber = getWeekOfYear(new Date(task.start_date));
            timeDataTasks[weekNumber - 1]++;
          });
        });
      });
    } else if (filterTime === "monthly") {
      timeLabels = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      timeDataTickets = Array(12).fill(0);
      timeDataTasks = Array(12).fill(0);

      data.forEach((user) => {
        user.tickets.forEach((ticket) => {
          const month = new Date(ticket.open_date).getMonth();
          timeDataTickets[month]++;
        });
        user.tasks.forEach((task) => {
          const month = new Date(task.start_date).getMonth();
          timeDataTasks[month]++;
        });
      });
    } else if (filterTime === "yearly") {
      const currentYear = new Date().getFullYear();
      timeLabels = Array.from({ length: 10 }, (_, i) => `${currentYear - i}`);
      timeDataTickets = Array(10).fill(0);
      timeDataTasks = Array(10).fill(0);

      data.forEach((user) => {
        user.tickets.forEach((ticket) => {
          const year = new Date(ticket.open_date).getFullYear();
          const yearIndex = currentYear - year;
          if (yearIndex >= 0 && yearIndex < 10) {
            timeDataTickets[yearIndex]++;
          }
        });
        user.tasks.forEach((task) => {
          const year = new Date(task.start_date).getFullYear();
          const yearIndex = currentYear - year;
          if (yearIndex >= 0 && yearIndex < 10) {
            timeDataTasks[yearIndex]++;
          }
        });
      });
    }

    setTimeChartData({
      labels: timeLabels,
      datasets: [
        {
          label: "Total Tickets",
          data: timeDataTickets,
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1,
        },
        {
          label: "Total Tasks",
          data: timeDataTasks,
          backgroundColor: "rgba(153, 102, 255, 0.2)",
          borderColor: "rgba(153, 102, 255, 1)",
          borderWidth: 1,
        },
      ],
    });
  };

  // Utility function to calculate the week of the year
  const getWeekOfYear = (date) => {
    const start = new Date(date.getFullYear(), 0, 1);
    const diff =
      (date -
        start +
        (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60000) /
      86400000;
    return Math.floor(diff / 7) + 1;
  };

  // Handle team selection change
  const handleTeamChange = async (teamId) => {
    setFilterTeam(teamId);
    setFilterTime("All");
    setFilterSpecificTime("");

    if (teamId === "All") {
      setFilteredData([]);
      setChartData(null); // Reset chart data if no team is selected
    } else {
      await loadTeamUsers(teamId); // Load team users here, no need to do anything else
    }
  };

  // This useEffect updates timeChartData only when the main time filter (filterTime) changes
  useEffect(() => {
    if (filterTime !== "All") {
      generateTimeChartData(groupUsers); // Update time chart for time periods (weekly, monthly, yearly)
    }
  }, [filterTime]); // Remove filterSpecificTime from this array

  // Render user chart when chartData is updated (only on team change)
  useEffect(() => {
    if (chartData) {
      const ctx = document.getElementById("userChart").getContext("2d");
      // Ensure that we destroy the previous chart before creating a new one
      if (window.userChart && typeof window.userChart.destroy === "function") {
        window.userChart.destroy();
      }
      window.userChart = new Chart(ctx, {
        type: "bar",
        data: chartData,
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
  }, [chartData]); // Trigger only when `chartData` changes

  // Render timeChart only when time filters change
  useEffect(() => {
    if (timeChartData) {
      const ctx = document.getElementById("timeChart").getContext("2d");
      // Ensure we destroy the previous chart before creating a new one
      if (window.timeChart && typeof window.timeChart.destroy === "function") {
        window.timeChart.destroy();
      }
      window.timeChart = new Chart(ctx, {
        type: "bar", // Use the appropriate chart type
        data: timeChartData,
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
  }, [timeChartData]); // Trigger only when `timeChartData` changes

  // Filter data based on time filter and update both user and time charts
  const filterDataByTime = () => {
    let filtered = [...groupUsers];

    switch (filterTime) {
      case "weekly":
        filtered = filtered.map((user) => {
          const filteredClosedTickets = user.tickets
            .filter((ticket) =>
              isInDateRange(ticket.open_date, "weekly", filterSpecificTime)
            )
            .filter((ticket) => ticket.status === 6).length;
          const filteredOpenTickets = user.tickets
            .filter((ticket) =>
              isInDateRange(ticket.open_date, "weekly", filterSpecificTime)
            )
            .filter((ticket) => ticket.status !== 6).length;

          return {
            ...user,
            taskCount: user.tasks.filter((task) =>
              isInDateRange(task.start_date, "weekly", filterSpecificTime)
            ).length,
            closedTickets: filteredClosedTickets,
            openTickets: filteredOpenTickets,
            totalTickets: filteredClosedTickets + filteredOpenTickets,
          };
        });
        break;

      case "monthly":
        filtered = filtered.map((user) => {
          const filteredClosedTickets = user.tickets
            .filter((ticket) =>
              isInDateRange(ticket.open_date, "monthly", filterSpecificTime)
            )
            .filter((ticket) => ticket.status === 6).length;
          const filteredOpenTickets = user.tickets
            .filter((ticket) =>
              isInDateRange(ticket.open_date, "monthly", filterSpecificTime)
            )
            .filter((ticket) => ticket.status !== 6).length;

          return {
            ...user,
            taskCount: user.tasks.filter((task) =>
              isInDateRange(task.start_date, "monthly", filterSpecificTime)
            ).length,
            closedTickets: filteredClosedTickets,
            openTickets: filteredOpenTickets,
            totalTickets: filteredClosedTickets + filteredOpenTickets,
          };
        });
        break;

      case "yearly":
        filtered = filtered.map((user) => {
          const filteredClosedTickets = user.tickets
            .filter((ticket) =>
              isInDateRange(ticket.open_date, "yearly", filterSpecificTime)
            )
            .filter((ticket) => ticket.status === 6).length;
          const filteredOpenTickets = user.tickets
            .filter((ticket) =>
              isInDateRange(ticket.open_date, "yearly", filterSpecificTime)
            )
            .filter((ticket) => ticket.status !== 6).length;

          return {
            ...user,
            taskCount: user.tasks.filter((task) =>
              isInDateRange(task.start_date, "yearly", filterSpecificTime)
            ).length,
            closedTickets: filteredClosedTickets,
            openTickets: filteredOpenTickets,
            totalTickets: filteredClosedTickets + filteredOpenTickets,
          };
        });
        break;

      default:
        break;
    }

    setFilteredData(filtered);

    if (filterTime === "All") {
      generateChartData(filtered); // Update user chart only if filterTime is "All"
    }
  };

  // Only run filterDataByTime for time-related filter changes
  useEffect(() => {
    if (filterTime !== "All") {
      filterDataByTime();
    }
  }, [filterTime, filterSpecificTime]); // Trigger only when time filters change

  // Helper function to filter by date range
  const isInDateRange = (dateStr, periodType, periodValue) => {
    const date = new Date(dateStr);
    const currentYear = new Date().getFullYear();

    if (periodType === "weekly") {
      const firstDayOfYear = new Date(currentYear, 0, 1);
      const daysOffset = (date.getDay() + 6) % 7;
      const startOfWeek = new Date(
        firstDayOfYear.getTime() +
          (parseInt(periodValue) - 1) * 7 * 24 * 60 * 60 * 1000 -
          daysOffset * 24 * 60 * 60 * 1000
      );
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      return date >= startOfWeek && date <= endOfWeek;
    }

    if (periodType === "monthly") {
      return date.getMonth() === parseInt(periodValue);
    }

    if (periodType === "yearly") {
      return date.getFullYear() === parseInt(periodValue);
    }

    return true;
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();

    doc.text("GLPI Reports", 20, 10);

    doc.autoTable({
      head: [
        [
          "#",
          "Full Name",
          "# of Closed Tickets",
          "# of Open Tickets",
          "Total Tickets",
          "# of Task",
        ],
      ],
      body: filteredData.map((user, index) => [
        index + 1,
        user.fullName,
        user.closedTickets,
        user.openTickets,
        user.totalTickets,
        user.taskCount,
      ]),
    });

    doc.save("GLPI_Reports.pdf");
  };

  const handleExportExcel = () => {
    if (!filteredData || filteredData.length === 0) {
      console.error("No data available for export");
      return;
    }

    console.log("Filtered data: ", filteredData);

    // Prepare the data for Excel
    const headers = [
      "#",
      "Full Name",
      "# of Closed Tickets",
      "# of Open Tickets",
      "Total Tickets",
      "# of Task",
    ];

    const rows = filteredData.map((user, index) => [
      index + 1,
      user.fullName || "N/A",
      user.closedTickets || 0,
      user.openTickets || 0,
      user.totalTickets || 0,
      user.taskCount || 0,
    ]);

    const sheetData = [headers, ...rows];

    // Create a new workbook and worksheet
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Set column widths
    const wscols = [
      { wch: 5 }, // Width of the first column (Row number)
      { wch: 25 }, // Width of the Full Name column
      { wch: 15 }, // Width for Closed Tickets column
      { wch: 15 }, // Width for Open Tickets column
      { wch: 15 }, // Width for Total Tickets column
      { wch: 10 }, // Width for Task Count column
    ];
    ws["!cols"] = wscols;

    // Apply styling to the headers
    const headerCells = [
      { r: 0, c: 0 },
      { r: 0, c: 1 },
      { r: 0, c: 2 },
      { r: 0, c: 3 },
      { r: 0, c: 4 },
      { r: 0, c: 5 },
    ];
    const headerColors = [
      { rgb: "C6E2B5" }, // light green
      { rgb: "F7DC6F" }, // light yellow
      { rgb: "C5CAE9" }, // light blue
      { rgb: "F2C464" }, // light orange
      { rgb: "8BC34A" }, // light green
      { rgb: "FFC107" }, // light orange
    ];
    headerCells.forEach((cell, index) => {
      ws[XLSX.utils.encode_cell(cell)].s = {
        font: { bold: true },
        alignment: { horizontal: "center", vertical: "center" },
        fill: { fgColor: headerColors[index] },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } },
        },
      };
    });

    // Create the workbook and append the worksheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "GLPI Reports");

    // Export the Excel file
    XLSX.writeFile(wb, "GLPI_Reports.xlsx");

    console.log("Excel file created and downloaded.");
  };

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);
  const totalPages = Math.ceil(filteredData.length / pageSize);

  return (
    <div className="weekly-reports-container">
      <h1 className="reports-header">GLPI Reports</h1>

      <div className="quick-actions">
        <FontAwesomeIcon
          icon={faFilePdf}
          className="action-icon pdf-icon"
          onClick={handleDownloadPDF}
          title="Download PDF"
        />
      </div>
      <div className="quick-actions">
        <FontAwesomeIcon
          icon={faFileCsv}
          className="action-icon csv-icon"
          onClick={handleExportExcel}
          title="Export to CSV"
        />
      </div>

      {/* Filter by Team */}
      <div className="filter-section">
        <div className="filter-container">
          <label htmlFor="team-filter">Team: </label>
          <select
            id="team-filter"
            value={filterTeam}
            onChange={(e) => handleTeamChange(e.target.value)}
          >
            <option value="All">All</option>
            {teams.map((team, index) => (
              <option key={index} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter by Time */}
        <div className="filter-container">
          <label htmlFor="time-filter">Filter by: </label>
          <select
            id="time-filter"
            value={filterTime}
            onChange={(e) => {
              setFilterTime(e.target.value);
              setFilterSpecificTime("");
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
              {Array.from({ length: 52 }, (_, i) => i + 1).map(
                (week, index) => (
                  <option key={index} value={week}>
                    Week {week}
                  </option>
                )
              )}
            </select>
          )}

          {filterTime === "monthly" && (
            <select
              id="month-filter"
              value={filterSpecificTime}
              onChange={(e) => setFilterSpecificTime(e.target.value)}
            >
              {[
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
              ].map((month, index) => (
                <option key={index} value={index}>
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
              {Array.from({ length: 7 }, (_, i) => 2023 + i).map(
                (year, index) => (
                  <option key={index} value={year}>
                    {year}
                  </option>
                )
              )}
            </select>
          )}
        </div>
      </div>

      {/* Chart Row */}
      <div
        className="charts-row"
        style={{ display: "flex", justifyContent: "space-between" }}
      >
        {/* User Chart */}
        <div className="chart-container" style={{ width: "48%" }}>
          <canvas id="userChart"></canvas>
        </div>

        {/* Time-based Chart */}
        <div className="chart-container" style={{ width: "48%" }}>
          <canvas id="timeChart"></canvas>
        </div>
      </div>

      {/* Displaying Table */}
      <div className="table-container">
        <table className="report-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Full Name</th>
              <th># of Closed Tickets</th>
              <th># of Open Tickets</th>
              <th>Total Tickets</th>
              <th># of Task</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((user, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{user.fullName}</td>
                  <td>{user.closedTickets}</td>
                  <td>{user.openTickets}</td>
                  <td>{user.totalTickets}</td>
                  <td>{user.taskCount}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: "center" }}>
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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
    </div>
  );
}

export default WeeklyReports;
