// Mock data — will be replaced by a real API call once the backend exists.
const allTickets = [
  { id: "T-1042", title: "VPN not connecting", category: "network", priority: "high", status: "open", agent: "Alex Kim", department: "IT", updated: "2026-08-12", mine: false },
  { id: "T-1041", title: "Payroll portal error", category: "software", priority: "critical", status: "in-progress", agent: "Priya Nair", department: "Finance", updated: "2026-08-12", mine: false },
  { id: "T-1039", title: "New laptop request", category: "hardware", priority: "low", status: "resolved", agent: "Alex Kim", department: "IT", updated: "2026-08-11", mine: false },
  { id: "T-1038", title: "Access to shared drive", category: "account-access", priority: "medium", status: "open", agent: "Unassigned", department: "Operations", updated: "2026-08-11", mine: false },
  { id: "T-1037", title: "Slow wifi in conference room", category: "network", priority: "medium", status: "in-progress", agent: "Jordan Lee", department: "IT", updated: "2026-08-11", mine: false },
  { id: "T-1036", title: "Software license renewal", category: "software", priority: "low", status: "closed", agent: "Priya Nair", department: "Finance", updated: "2026-08-10", mine: false },
  { id: "T-1035", title: "Email sync issue", category: "software", priority: "medium", status: "closed", agent: "Alex Kim", department: "IT", updated: "2026-08-10", mine: true },
  { id: "T-1034", title: "Password reset", category: "account-access", priority: "low", status: "resolved", agent: "Jordan Lee", department: "HR", updated: "2026-08-10", mine: false },
  { id: "T-1033", title: "Monitor not turning on", category: "hardware", priority: "medium", status: "open", agent: "Unassigned", department: "IT", updated: "2026-08-09", mine: false },
  { id: "T-1032", title: "Timesheet app crashing", category: "software", priority: "high", status: "in-progress", agent: "Priya Nair", department: "Finance", updated: "2026-08-09", mine: false },
  { id: "T-1031", title: "Printer offline - 3rd floor", category: "hardware", priority: "medium", status: "open", agent: "Alex Kim", department: "Operations", updated: "2026-08-10", mine: false },
  { id: "T-1028", title: "Blocked website access request", category: "network", priority: "low", status: "open", agent: "Unassigned", department: "IT", updated: "2026-08-08", mine: false },
  { id: "T-1025", title: "Onboarding account setup", category: "account-access", priority: "high", status: "resolved", agent: "Jordan Lee", department: "HR", updated: "2026-08-07", mine: false },
  { id: "T-1020", title: "Monitor flickering", category: "hardware", priority: "low", status: "resolved", agent: "Alex Kim", department: "IT", updated: "2026-08-05", mine: true },
];

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

const categoryLabel = {
  hardware: "Hardware",
  software: "Software",
  network: "Network",
  "account-access": "Account Access",
  other: "Other",
};

let currentRole = "user";

const searchInput = document.getElementById("search-input");
const statusFilter = document.getElementById("filter-status");
const priorityFilter = document.getElementById("filter-priority");
const categoryFilter = document.getElementById("filter-category");
const agentFilter = document.getElementById("filter-agent");
const clearBtn = document.getElementById("clear-filters");
const ticketsBody = document.getElementById("tickets-body");
const ticketsTitle = document.getElementById("tickets-title");
const ticketsCount = document.getElementById("tickets-count");
const adminLink = document.querySelector(".admin-only");
const roleTabs = document.querySelectorAll(".role-tab");

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function baseSetForRole(role) {
  if (role === "user") {
    return allTickets.filter((t) => t.mine);
  }
  return allTickets;
}

function render() {
  const search = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value;
  const priority = priorityFilter.value;
  const category = categoryFilter.value;
  const agent = agentFilter.value;

  const filtered = baseSetForRole(currentRole).filter((t) => {
    if (search && !t.id.toLowerCase().includes(search) && !t.title.toLowerCase().includes(search)) return false;
    if (status !== "all" && t.status !== status) return false;
    if (priority !== "all" && t.priority !== priority) return false;
    if (category !== "all" && t.category !== category) return false;
    if (agent !== "all" && t.agent !== agent) return false;
    return true;
  });

  ticketsTitle.textContent = currentRole === "user" ? "My tickets" : "All tickets";
  ticketsCount.textContent = `Showing ${filtered.length} of ${baseSetForRole(currentRole).length} tickets`;

  ticketsBody.innerHTML = "";

  if (filtered.length === 0) {
    const row = document.createElement("tr");
    row.className = "empty-row";
    row.innerHTML = `<td colspan="8">No tickets match your filters.</td>`;
    ticketsBody.appendChild(row);
    return;
  }

  filtered.forEach((t) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="ticket-id">${t.id}</td>
      <td>${t.title}</td>
      <td>${categoryLabel[t.category]}</td>
      <td><span class="pill ${priorityPillClass[t.priority]}">${capitalize(t.priority)}</span></td>
      <td><span class="pill ${statusPillClass[t.status]}">${capitalize(t.status.replace("-", " "))}</span></td>
      <td>${t.agent}</td>
      <td>${t.department}</td>
      <td>${t.updated}</td>
    `;
    ticketsBody.appendChild(row);
  });
}

[searchInput, statusFilter, priorityFilter, categoryFilter, agentFilter].forEach((el) => {
  el.addEventListener("input", render);
  el.addEventListener("change", render);
});

clearBtn.addEventListener("click", () => {
  searchInput.value = "";
  statusFilter.value = "all";
  priorityFilter.value = "all";
  categoryFilter.value = "all";
  agentFilter.value = "all";
  render();
});

roleTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    roleTabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    currentRole = tab.dataset.role;
    adminLink.hidden = currentRole !== "admin";
    render();
  });
});

adminLink.hidden = currentRole !== "admin";
render();
