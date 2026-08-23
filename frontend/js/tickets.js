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
const exportCsvBtn = document.getElementById("export-csv-btn");
const savedViewsList = document.getElementById("saved-views-list");
const saveViewForm = document.getElementById("save-view-form");
const saveViewNameInput = document.getElementById("save-view-name-input");
const savedViewError = document.getElementById("saved-view-error");
const ticketsBody = document.getElementById("tickets-body");
const ticketsTitle = document.getElementById("tickets-title");
const ticketsCount = document.getElementById("tickets-count");
const errorEl = document.getElementById("tickets-error");

const selectAllCheckbox = document.getElementById("select-all-checkbox");
const bulkBar = document.getElementById("bulk-actions-bar");
const bulkCount = document.getElementById("bulk-selected-count");
const bulkStatus = document.getElementById("bulk-status");
const bulkPriority = document.getElementById("bulk-priority");
const bulkAssign = document.getElementById("bulk-assign");
const bulkApplyBtn = document.getElementById("bulk-apply-btn");
const bulkClearBtn = document.getElementById("bulk-clear-btn");
const bulkError = document.getElementById("bulk-error");

const selectedIds = new Set();
let currentTickets = [];
let focusedRowIndex = -1;

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
    currentTickets = filtered;
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

  // Rows are rebuilt from scratch on every render (filters, live updates), so any
  // previous selection no longer corresponds to real checkboxes — drop it rather than
  // leave the bulk bar showing a count for rows that don't exist anymore.
  selectedIds.clear();
  if (selectAllCheckbox) selectAllCheckbox.checked = false;
  updateBulkBar();
  focusedRowIndex = -1;

  if (tickets.length === 0) {
    const row = document.createElement("tr");
    row.className = "empty-row";
    row.innerHTML = `<td colspan="${isStaff ? 9 : 8}">No tickets match your filters.</td>`;
    ticketsBody.appendChild(row);
    return;
  }

  tickets.forEach((t) => {
    const row = document.createElement("tr");
    const checkboxCell = isStaff
      ? `<td><input type="checkbox" class="row-checkbox" data-id="${t.id}" aria-label="Select ${t.displayId}" /></td>`
      : "";
    row.innerHTML = `
      ${checkboxCell}
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

function updateBulkBar() {
  if (!isStaff) return;
  const count = selectedIds.size;
  bulkBar.hidden = count === 0;
  bulkCount.textContent = `${count} ticket${count === 1 ? "" : "s"} selected`;
}

async function loadBulkAssignOptions() {
  if (!isStaff) return;
  const agents = await apiFetch("/agents");
  agents.forEach((agent) => {
    const opt = document.createElement("option");
    opt.value = agent.id;
    opt.textContent = agent.name;
    bulkAssign.appendChild(opt);
  });
}

ticketsBody.addEventListener("change", (event) => {
  if (!event.target.classList.contains("row-checkbox")) return;

  const id = Number(event.target.dataset.id);
  if (event.target.checked) {
    selectedIds.add(id);
  } else {
    selectedIds.delete(id);
  }

  const allCheckboxes = document.querySelectorAll(".row-checkbox");
  if (selectAllCheckbox) {
    selectAllCheckbox.checked = allCheckboxes.length > 0 && selectedIds.size === allCheckboxes.length;
  }
  updateBulkBar();
});

selectAllCheckbox?.addEventListener("change", () => {
  const allCheckboxes = document.querySelectorAll(".row-checkbox");
  allCheckboxes.forEach((cb) => {
    cb.checked = selectAllCheckbox.checked;
    const id = Number(cb.dataset.id);
    if (selectAllCheckbox.checked) {
      selectedIds.add(id);
    } else {
      selectedIds.delete(id);
    }
  });
  updateBulkBar();
});

bulkClearBtn?.addEventListener("click", () => {
  selectedIds.clear();
  document.querySelectorAll(".row-checkbox").forEach((cb) => (cb.checked = false));
  if (selectAllCheckbox) selectAllCheckbox.checked = false;
  updateBulkBar();
});

bulkApplyBtn?.addEventListener("click", async () => {
  bulkError.hidden = true;

  const status = bulkStatus.value;
  const priority = bulkPriority.value;
  const assignRaw = bulkAssign.value;

  if (!status && !priority && !assignRaw) {
    bulkError.textContent = "Choose at least one change to apply.";
    bulkError.hidden = false;
    return;
  }

  const body = { ticketIds: Array.from(selectedIds) };
  if (status) body.status = status;
  if (priority) body.priority = priority;
  if (assignRaw) body.assignedTo = assignRaw === "unassign" ? null : Number(assignRaw);

  try {
    await apiFetch("/tickets/bulk", { method: "PATCH", body: JSON.stringify(body) });
    bulkStatus.value = "";
    bulkPriority.value = "";
    bulkAssign.value = "";
    await render();
  } catch (err) {
    bulkError.textContent = err.message;
    bulkError.hidden = false;
  }
});

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

// ---------- Saved Views ----------

function currentFilterValues() {
  return {
    search: searchInput.value.trim(),
    status: statusFilter.value,
    priority: priorityFilter.value,
    category: categoryFilter.value,
    assignedAgent: agentFilter.value,
  };
}

function applyFilterValues(filters) {
  searchInput.value = filters.search || "";
  statusFilter.value = filters.status || "all";
  priorityFilter.value = filters.priority || "all";
  categoryFilter.value = filters.category || "all";
  agentFilter.value = filters.assignedAgent || "all";
  render();
}

function renderSavedViewChip(view) {
  const chip = document.createElement("span");
  chip.className = "saved-view-chip";

  const applyBtn = document.createElement("button");
  applyBtn.type = "button";
  applyBtn.className = "saved-view-apply";
  applyBtn.dataset.viewId = view.id;
  applyBtn.textContent = view.name;
  applyBtn.addEventListener("click", () => applyFilterValues(view.filters));

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "saved-view-delete";
  deleteBtn.dataset.viewId = view.id;
  deleteBtn.setAttribute("aria-label", `Delete view ${view.name}`);
  deleteBtn.textContent = "×";
  deleteBtn.addEventListener("click", async () => {
    try {
      await apiFetch(`/saved-views/${view.id}`, { method: "DELETE" });
      loadSavedViews();
    } catch (err) {
      savedViewError.textContent = err.message;
      savedViewError.hidden = false;
    }
  });

  chip.appendChild(applyBtn);
  chip.appendChild(deleteBtn);
  return chip;
}

async function loadSavedViews() {
  try {
    const views = await apiFetch("/saved-views");
    savedViewsList.innerHTML = "";
    views.forEach((view) => savedViewsList.appendChild(renderSavedViewChip(view)));
  } catch (err) {
    savedViewError.textContent = err.message;
    savedViewError.hidden = false;
  }
}

saveViewForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  savedViewError.hidden = true;
  const name = saveViewNameInput.value.trim();

  try {
    await apiFetch("/saved-views", {
      method: "POST",
      body: JSON.stringify({ name, filters: currentFilterValues() }),
    });
    saveViewNameInput.value = "";
    loadSavedViews();
  } catch (err) {
    savedViewError.textContent = err.message;
    savedViewError.hidden = false;
  }
});

// Wraps a field in quotes (doubling any embedded quotes) only when it actually needs
// it — a comma, quote, or newline in the value would otherwise corrupt the CSV shape.
function csvEscape(value) {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function ticketsToCsv(tickets) {
  const headers = ["ID", "Title", "Category", "Priority", "Status", "Assigned Agent", "Department", "Updated"];
  const rows = tickets.map((t) => [
    t.displayId,
    t.title,
    t.category,
    t.priority,
    t.status,
    t.assignedAgent || "Unassigned",
    t.department,
    new Date(t.updatedAt).toLocaleDateString(),
  ]);
  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

exportCsvBtn.addEventListener("click", () => {
  const csv = ticketsToCsv(currentTickets);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tickets-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
});

function selectableRows() {
  return Array.from(ticketsBody.querySelectorAll("tr")).filter((row) => !row.classList.contains("empty-row"));
}

function updateRowFocus() {
  selectableRows().forEach((row, i) => row.classList.toggle("row-focused", i === focusedRowIndex));
}

const shortcutsHelp = initShortcutsHelp([
  { keys: "j / k", description: "Move the selection down / up" },
  { keys: "Enter", description: "Open the selected ticket" },
  { keys: "/", description: "Focus the search box" },
  { keys: "?", description: "Show this help" },
]);
document.getElementById("shortcuts-help-btn")?.addEventListener("click", () => shortcutsHelp.show());

document.addEventListener("keydown", (event) => {
  if (isTypingContext(event.target)) return;

  const rows = selectableRows();

  if (event.key === "j") {
    event.preventDefault();
    focusedRowIndex = Math.min(focusedRowIndex + 1, rows.length - 1);
    updateRowFocus();
    rows[focusedRowIndex]?.scrollIntoView({ block: "nearest" });
  } else if (event.key === "k") {
    event.preventDefault();
    focusedRowIndex = Math.max(focusedRowIndex - 1, 0);
    updateRowFocus();
    rows[focusedRowIndex]?.scrollIntoView({ block: "nearest" });
  } else if (event.key === "Enter" && focusedRowIndex >= 0 && rows[focusedRowIndex]) {
    rows[focusedRowIndex].querySelector(".ticket-id")?.click();
  } else if (event.key === "/") {
    event.preventDefault();
    searchInput.focus();
  }
});

const session = requireSession();
const isStaff = session.user.role === "agent" || session.user.role === "admin";
ticketsTitle.textContent = session.user.role === "user" ? "My tickets" : "All tickets";
render();
loadBulkAssignOptions();
loadSavedViews();

// Live-refresh the queue when any ticket changes — staff room membership means users
// simply won't receive this event, so no extra role check is needed here.
if (window.hdproSocket) {
  window.hdproSocket.on("ticket:changed", () => render());
}
