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

const searchInput = document.getElementById("search-input");
const statusFilter = document.getElementById("filter-status");
const priorityFilter = document.getElementById("filter-priority");
const categoryFilter = document.getElementById("filter-category");
const agentFilter = document.getElementById("filter-agent");
const clearBtn = document.getElementById("clear-filters");
const ticketsBody = document.getElementById("tickets-body");
const ticketsTitle = document.getElementById("tickets-title");
const ticketsCount = document.getElementById("tickets-count");
const errorEl = document.getElementById("tickets-error");

function buildFilterQuery() {
  const params = new URLSearchParams();
  const search = searchInput.value.trim();
  if (search) params.set("search", search);
  if (statusFilter.value !== "all") params.set("status", statusFilter.value);
  if (priorityFilter.value !== "all") params.set("priority", priorityFilter.value);
  if (categoryFilter.value !== "all") params.set("category", categoryFilter.value);
  if (agentFilter.value !== "all") params.set("assignedAgent", agentFilter.value);
  return params.toString();
}

async function render() {
  errorEl.hidden = true;

  try {
    const [filtered, base] = await Promise.all([
      apiFetch(`/tickets?${buildFilterQuery()}`),
      apiFetch("/tickets"),
    ]);

    ticketsCount.textContent = `Showing ${filtered.length} of ${base.length} tickets`;
    renderRows(filtered);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
    ticketsBody.innerHTML = "";
    ticketsCount.textContent = "";
  }
}

function renderRows(tickets) {
  ticketsBody.innerHTML = "";

  if (tickets.length === 0) {
    const row = document.createElement("tr");
    row.className = "empty-row";
    row.innerHTML = `<td colspan="8">No tickets match your filters.</td>`;
    ticketsBody.appendChild(row);
    return;
  }

  tickets.forEach((t) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><a class="ticket-id" href="ticket-detail.html?id=${t.displayId}">${t.displayId}</a></td>
      <td>${t.title}</td>
      <td>${t.category}</td>
      <td><span class="pill ${priorityPillClass[t.priority]}">${capitalize(t.priority)}</span></td>
      <td><span class="pill ${statusPillClass[t.status]}">${capitalize(t.status.replace("-", " "))}</span></td>
      <td>${t.assignedAgent || "Unassigned"}</td>
      <td>${t.department}</td>
      <td>${new Date(t.updatedAt).toLocaleDateString()}</td>
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

const session = requireSession();
ticketsTitle.textContent = session.user.role === "user" ? "My tickets" : "All tickets";
render();
