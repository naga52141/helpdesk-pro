const STAT_LABELS = ["Total Tickets", "Open", "In Progress", "Resolved", "High / Critical", "SLA Breaches"];
const STAT_KEYS = ["total", "open", "inProgress", "resolved", "highCritical", "slaBreaches"];
const STAT_COLORS = ["#2f6feb", "#2f6feb", "#b8860b", "#1f9d55", "#d2691e", "#d64545"];

const ROLE_TEXT = {
  admin: { greeting: "Welcome back, Admin", subtitle: "Organization-wide ticket overview", recentTitle: "Recent tickets (all)" },
  agent: { greeting: "Welcome back, Agent", subtitle: "Tickets assigned to you", recentTitle: "My recent tickets" },
  user: { greeting: "Welcome back", subtitle: "A summary of tickets you've submitted", recentTitle: "My tickets" },
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
const errorEl = document.getElementById("dashboard-error");

function renderStats(stats) {
  statGrid.innerHTML = "";
  STAT_KEYS.forEach((key, i) => {
    const card = document.createElement("div");
    card.className = "stat-card";
    card.style.setProperty("--stat-color", STAT_COLORS[i]);
    card.innerHTML = `
      <div class="stat-label">${STAT_LABELS[i]}</div>
      <div class="stat-value">${stats[key]}</div>
    `;
    statGrid.appendChild(card);
  });
}

function renderRecentTickets(tickets) {
  recentBody.innerHTML = "";

  if (tickets.length === 0) {
    recentBody.innerHTML = `<tr class="empty-row"><td colspan="6">No tickets yet.</td></tr>`;
    return;
  }

  tickets.forEach((ticket) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><a class="ticket-id" href="ticket-detail.html?id=${ticket.displayId}">${ticket.displayId}</a></td>
      <td>${ticket.title}</td>
      <td>${ticket.category}</td>
      <td><span class="pill ${priorityPillClass[ticket.priority]}">${capitalize(ticket.priority)}</span></td>
      <td><span class="pill ${statusPillClass[ticket.status]}">${capitalize(ticket.status.replace("-", " "))}</span></td>
      <td>${new Date(ticket.updatedAt).toLocaleDateString()}</td>
    `;
    recentBody.appendChild(row);
  });
}

async function render(role) {
  const text = ROLE_TEXT[role];
  greetingEl.textContent = text.greeting;
  subtitleEl.textContent = text.subtitle;
  recentTitleEl.textContent = text.recentTitle;
  errorEl.hidden = true;

  try {
    const { stats, recentTickets } = await apiFetch("/dashboard/stats");
    renderStats(stats);
    renderRecentTickets(recentTickets);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
    statGrid.innerHTML = "";
    recentBody.innerHTML = "";
  }
}

const session = requireSession();
render(session.user.role);
