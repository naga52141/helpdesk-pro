// Mock data — will be replaced by real API calls once the backend exists.
const mockDashboard = {
  admin: {
    greeting: "Welcome back, Admin",
    subtitle: "Organization-wide ticket overview",
    stats: [
      { label: "Total Tickets", value: 128, color: "#2f6feb" },
      { label: "Open", value: 34, color: "#2f6feb" },
      { label: "In Progress", value: 22, color: "#b8860b" },
      { label: "Resolved", value: 65, color: "#1f9d55" },
      { label: "High / Critical", value: 9, color: "#d2691e" },
      { label: "SLA Breaches", value: 4, color: "#d64545" },
    ],
    recentTitle: "Recent tickets (all)",
    tickets: [
      { id: "T-1042", title: "VPN not connecting", category: "Network", priority: "high", status: "open", updated: "2026-08-12" },
      { id: "T-1041", title: "Payroll portal error", category: "Software", priority: "critical", status: "in-progress", updated: "2026-08-12" },
      { id: "T-1039", title: "New laptop request", category: "Hardware", priority: "low", status: "resolved", updated: "2026-08-11" },
      { id: "T-1035", title: "Email sync issue", category: "Software", priority: "medium", status: "closed", updated: "2026-08-10" },
      { id: "T-1031", title: "Printer offline - 3rd floor", category: "Hardware", priority: "medium", status: "open", updated: "2026-08-10" },
    ],
  },
  agent: {
    greeting: "Welcome back, Agent",
    subtitle: "Tickets assigned to you",
    stats: [
      { label: "Total Assigned", value: 18, color: "#2f6feb" },
      { label: "Open", value: 6, color: "#2f6feb" },
      { label: "In Progress", value: 5, color: "#b8860b" },
      { label: "Resolved", value: 7, color: "#1f9d55" },
      { label: "High / Critical", value: 2, color: "#d2691e" },
      { label: "SLA Breaches", value: 1, color: "#d64545" },
    ],
    recentTitle: "My recent tickets",
    tickets: [
      { id: "T-1042", title: "VPN not connecting", category: "Network", priority: "high", status: "open", updated: "2026-08-12" },
      { id: "T-1039", title: "New laptop request", category: "Hardware", priority: "low", status: "resolved", updated: "2026-08-11" },
      { id: "T-1031", title: "Printer offline - 3rd floor", category: "Hardware", priority: "medium", status: "open", updated: "2026-08-10" },
    ],
  },
  user: {
    greeting: "Welcome back",
    subtitle: "A summary of tickets you've submitted",
    stats: [
      { label: "Total Submitted", value: 5, color: "#2f6feb" },
      { label: "Open", value: 2, color: "#2f6feb" },
      { label: "In Progress", value: 1, color: "#b8860b" },
      { label: "Resolved", value: 2, color: "#1f9d55" },
      { label: "High / Critical", value: 0, color: "#d2691e" },
      { label: "SLA Breaches", value: 0, color: "#d64545" },
    ],
    recentTitle: "My tickets",
    tickets: [
      { id: "T-1035", title: "Email sync issue", category: "Software", priority: "medium", status: "closed", updated: "2026-08-10" },
      { id: "T-1020", title: "Monitor flickering", category: "Hardware", priority: "low", status: "resolved", updated: "2026-08-05" },
    ],
  },
};

const statusPillClass = {
  "open": "pill-open",
  "in-progress": "pill-in-progress",
  "resolved": "pill-resolved",
  "closed": "pill-closed",
};

const priorityPillClass = {
  low: "pill-low",
  medium: "pill-medium",
  high: "pill-high",
  critical: "pill-critical",
};

const statGrid = document.getElementById("stat-grid");
const recentBody = document.getElementById("recent-tickets-body");
const greetingEl = document.getElementById("dashboard-greeting");
const subtitleEl = document.getElementById("dashboard-subtitle");
const recentTitleEl = document.getElementById("recent-title");
const adminLink = document.querySelector(".admin-only");

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function render(role) {
  const data = mockDashboard[role];

  greetingEl.textContent = data.greeting;
  subtitleEl.textContent = data.subtitle;
  recentTitleEl.textContent = data.recentTitle;

  statGrid.innerHTML = "";
  data.stats.forEach((stat) => {
    const card = document.createElement("div");
    card.className = "stat-card";
    card.style.setProperty("--stat-color", stat.color);
    card.innerHTML = `
      <div class="stat-label">${stat.label}</div>
      <div class="stat-value">${stat.value}</div>
    `;
    statGrid.appendChild(card);
  });

  recentBody.innerHTML = "";
  data.tickets.forEach((ticket) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${ticket.id}</td>
      <td>${ticket.title}</td>
      <td>${ticket.category}</td>
      <td><span class="pill ${priorityPillClass[ticket.priority]}">${capitalize(ticket.priority)}</span></td>
      <td><span class="pill ${statusPillClass[ticket.status]}">${capitalize(ticket.status.replace("-", " "))}</span></td>
      <td>${ticket.updated}</td>
    `;
    recentBody.appendChild(row);
  });

  adminLink.hidden = role !== "admin";
}

const initialRole = initRolePreview(render);
render(initialRole);
