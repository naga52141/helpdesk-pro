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

const slaLabel = {
  breached: "SLA Breached",
  "due-today": "Due Today",
  met: "SLA Met",
  late: "Resolved Late",
  "on-track": "On Track",
};

const slaPillClass = {
  breached: "pill-sla-breached",
  "due-today": "pill-sla-due-today",
  met: "pill-sla-met",
  late: "pill-sla-late",
  "on-track": "pill-sla-on-track",
};

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function statusText(status) {
  return capitalize(status.replace("-", " "));
}

const params = new URLSearchParams(window.location.search);
const ticketId = params.get("id");
const found = TICKETS.find((t) => t.id === ticketId);

const notFoundEl = document.getElementById("not-found");
const contentEl = document.getElementById("ticket-content");

if (!found) {
  notFoundEl.hidden = false;
  contentEl.hidden = true;
} else {
  notFoundEl.hidden = true;
  contentEl.hidden = false;
  runDetailPage(found);
}

function runDetailPage(originalTicket) {
  const ticket = { ...originalTicket, comments: [...originalTicket.comments] };
  const originalSlaStatus = originalTicket.slaStatus;
  let currentRole = "user";

  const els = {
    title: document.getElementById("d-title"),
    id: document.getElementById("d-id"),
    statusPill: document.getElementById("d-status-pill"),
    priorityPill: document.getElementById("d-priority-pill"),
    slaPill: document.getElementById("d-sla-pill"),
    description: document.getElementById("d-description"),
    requester: document.getElementById("d-requester"),
    category: document.getElementById("d-category"),
    department: document.getElementById("d-department"),
    agent: document.getElementById("d-agent"),
    device: document.getElementById("d-device"),
    attachment: document.getElementById("d-attachment"),
    created: document.getElementById("d-created"),
    slaDue: document.getElementById("d-sla-due"),
    updated: document.getElementById("d-updated"),
    commentsList: document.getElementById("comments-list"),
    assignSelect: document.getElementById("assign-select"),
    statusSelect: document.getElementById("status-select"),
    prioritySelect: document.getElementById("priority-select"),
    agentControls: document.getElementById("agent-controls"),
    userControls: document.getElementById("user-controls"),
    userHint: document.getElementById("user-actions-hint"),
    reopenBtn: document.getElementById("reopen-btn"),
    adminLink: document.querySelector(".admin-only"),
  };

  function renderStaticFields() {
    els.title.textContent = ticket.title;
    els.id.textContent = ticket.id;
    els.description.textContent = ticket.description;
    els.requester.textContent = ticket.requester;
    els.category.textContent = categoryLabel[ticket.category];
    els.department.textContent = ticket.department;
    els.device.textContent = ticket.deviceInfo;
    els.attachment.textContent = ticket.attachment || "None";
    els.created.textContent = ticket.createdAt;
    els.slaDue.textContent = ticket.slaDueAt;
  }

  function renderDynamicFields() {
    els.statusPill.textContent = statusText(ticket.status);
    els.statusPill.className = `pill ${statusPillClass[ticket.status]}`;

    els.priorityPill.textContent = capitalize(ticket.priority);
    els.priorityPill.className = `pill ${priorityPillClass[ticket.priority]}`;

    els.slaPill.textContent = slaLabel[ticket.slaStatus];
    els.slaPill.className = `pill ${slaPillClass[ticket.slaStatus]}`;

    els.agent.textContent = ticket.agent;
    els.updated.textContent = ticket.updated;

    els.assignSelect.value = ticket.agent;
    els.statusSelect.value = ticket.status;
    els.prioritySelect.value = ticket.priority;

    if (ticket.status === "resolved") {
      els.userHint.textContent = "This ticket has been resolved. If the issue isn't fixed, you can reopen it.";
      els.reopenBtn.hidden = false;
    } else if (ticket.status === "closed") {
      els.userHint.textContent = "This ticket is closed.";
      els.reopenBtn.hidden = true;
    } else {
      els.userHint.textContent = "You'll be notified here when there's an update.";
      els.reopenBtn.hidden = true;
    }
  }

  function renderComments() {
    els.commentsList.innerHTML = "";
    if (ticket.comments.length === 0) {
      els.commentsList.innerHTML = `<p class="no-comments">No comments yet.</p>`;
      return;
    }
    ticket.comments.forEach((c) => {
      const div = document.createElement("div");
      div.className = "comment";
      div.innerHTML = `
        <div class="comment-meta">
          <span><span class="comment-author">${c.author}</span><span class="role-badge role-badge-${c.role}">${capitalize(c.role)}</span></span>
          <span>${c.time}</span>
        </div>
        <div>${c.text}</div>
      `;
      els.commentsList.appendChild(div);
    });
  }

  function touchUpdatedNow() {
    ticket.updated = new Date().toISOString().slice(0, 10);
  }

  function markToday() {
    ticket.slaStatus = "met";
  }

  function restoreOriginalSla() {
    ticket.slaStatus = originalSlaStatus;
  }

  function applyRoleVisibility() {
    const isAgentOrAdmin = currentRole === "agent" || currentRole === "admin";
    els.agentControls.hidden = !isAgentOrAdmin;
    els.userControls.hidden = isAgentOrAdmin;
    els.adminLink.hidden = currentRole !== "admin";
  }

  document.getElementById("assign-btn").addEventListener("click", () => {
    ticket.agent = els.assignSelect.value;
    touchUpdatedNow();
    renderDynamicFields();
  });

  document.getElementById("status-btn").addEventListener("click", () => {
    ticket.status = els.statusSelect.value;
    if (ticket.status === "resolved" || ticket.status === "closed") {
      markToday();
    } else {
      restoreOriginalSla();
    }
    touchUpdatedNow();
    renderDynamicFields();
  });

  document.getElementById("priority-btn").addEventListener("click", () => {
    ticket.priority = els.prioritySelect.value;
    touchUpdatedNow();
    renderDynamicFields();
  });

  document.getElementById("resolve-btn").addEventListener("click", () => {
    ticket.status = "resolved";
    markToday();
    touchUpdatedNow();
    renderDynamicFields();
  });

  document.getElementById("close-btn").addEventListener("click", () => {
    ticket.status = "closed";
    markToday();
    touchUpdatedNow();
    renderDynamicFields();
  });

  els.reopenBtn.addEventListener("click", () => {
    ticket.status = "in-progress";
    restoreOriginalSla();
    touchUpdatedNow();
    renderDynamicFields();
  });

  document.getElementById("comment-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const textarea = document.getElementById("comment-text");
    const text = textarea.value.trim();
    if (!text) return;

    const isAgentOrAdmin = currentRole === "agent" || currentRole === "admin";
    ticket.comments.push({
      author: "You",
      role: isAgentOrAdmin ? "agent" : "user",
      text,
      time: "Just now",
    });
    textarea.value = "";
    touchUpdatedNow();
    renderComments();
    renderDynamicFields();
  });

  currentRole = initRolePreview((role) => {
    currentRole = role;
    applyRoleVisibility();
  });

  renderStaticFields();
  renderDynamicFields();
  renderComments();
  applyRoleVisibility();
}
