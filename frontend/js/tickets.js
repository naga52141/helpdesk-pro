// Ticket data comes from the shared TICKETS array (js/ticket-data.js), loaded before this file.
const allTickets = TICKETS;

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
      <td><a class="ticket-id" href="ticket-detail.html?id=${t.id}">${t.id}</a></td>
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

currentRole = initRolePreview((role) => {
  currentRole = role;
  adminLink.hidden = currentRole !== "admin";
  render();
});
adminLink.hidden = currentRole !== "admin";
render();
