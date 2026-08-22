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

const FIELD_LABELS = {
  status: "status",
  priority: "priority",
  assigned_to: "assignment",
};

function formatHistoryValue(field, value) {
  if (field === "status") return statusText(value);
  if (field === "priority") return capitalize(value);
  return value; // assigned_to already stores names ("Unassigned" or an agent's name)
}

function statusText(status) {
  return capitalize(status.replace("-", " "));
}

function computeSlaStatus(ticket) {
  if (!ticket.slaDueAt) return "on-track";
  const due = new Date(ticket.slaDueAt);

  if (ticket.status === "resolved" || ticket.status === "closed") {
    const doneAt = new Date(ticket.resolvedAt || ticket.closedAt || ticket.updatedAt);
    return doneAt <= due ? "met" : "late";
  }

  const now = new Date();
  if (now > due) return "breached";
  if (due.toDateString() === now.toDateString()) return "due-today";
  return "on-track";
}

const session = requireSession();

const params = new URLSearchParams(window.location.search);
const ticketId = (params.get("id") || "").replace(/^T-/i, "");

const notFoundEl = document.getElementById("not-found");
const contentEl = document.getElementById("ticket-content");
const detailErrorEl = document.getElementById("detail-error");

// Live updates land as a banner rather than an auto re-render — silently overwriting
// fields while someone might be mid-way through typing a comment is worse than asking
// them to refresh. Joined immediately, before the ticket fetch below even starts — the
// Socket.IO client buffers emits made pre-connect and flushes them on connect, so this
// beats the fetch to the room join. Waiting until after the fetch resolves (socket
// connection can take longer than a plain REST call) left a window where a change
// landing right after page load would be silently missed, since room broadcasts aren't
// replayed for late joiners.
if (window.hdproSocket) {
  window.hdproSocket.emit("join-ticket", Number(ticketId));
  window.hdproSocket.on("ticket:changed", (data) => {
    if (data.id === Number(ticketId)) {
      document.getElementById("live-update-banner").hidden = false;
    }
  });
}

document.getElementById("live-update-refresh-btn").addEventListener("click", () => {
  window.location.reload();
});

init();

async function init() {
  try {
    const [ticket, agents] = await Promise.all([
      apiFetch(`/tickets/${ticketId}`),
      apiFetch("/agents"),
    ]);
    notFoundEl.hidden = true;
    contentEl.hidden = false;
    runDetailPage(ticket, agents);
  } catch (err) {
    if (err.message.includes("404") || err.message === "Ticket not found") {
      notFoundEl.hidden = false;
      contentEl.hidden = true;
    } else {
      detailErrorEl.textContent = err.message;
      detailErrorEl.hidden = false;
    }
  }
}

function runDetailPage(initialTicket, agents) {
  let ticket = initialTicket;
  const isAgentOrAdmin = session.user.role === "agent" || session.user.role === "admin";

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
    activityList: document.getElementById("activity-list"),
    csatPrompt: document.getElementById("csat-prompt"),
    csatStars: document.querySelectorAll(".csat-star"),
    csatComment: document.getElementById("csat-comment"),
    csatSubmitBtn: document.getElementById("csat-submit-btn"),
    csatError: document.getElementById("csat-error"),
    csatResult: document.getElementById("csat-result"),
    csatResultValue: document.getElementById("csat-result-value"),
    csatResultComment: document.getElementById("csat-result-comment"),
  };

  agents.forEach((agent) => {
    const opt = document.createElement("option");
    opt.value = agent.id;
    opt.textContent = agent.name;
    els.assignSelect.appendChild(opt);
  });

  els.agentControls.hidden = !isAgentOrAdmin;
  els.userControls.hidden = isAgentOrAdmin;

  function renderStaticFields() {
    els.title.textContent = ticket.title;
    els.id.textContent = ticket.displayId;
    els.description.textContent = ticket.description;
    els.requester.textContent = `${ticket.requesterName} <${ticket.requesterEmail}>`;
    els.category.textContent = ticket.category;
    els.department.textContent = ticket.department;
    els.device.textContent = ticket.deviceInfo || "N/A";
    renderAttachments();
    els.created.textContent = new Date(ticket.createdAt).toLocaleString();
    els.slaDue.textContent = ticket.slaDueAt ? new Date(ticket.slaDueAt).toLocaleString() : "N/A";
  }

  function renderDynamicFields() {
    els.statusPill.textContent = statusText(ticket.status);
    els.statusPill.className = `pill ${statusPillClass[ticket.status]}`;

    els.priorityPill.textContent = capitalize(ticket.priority);
    els.priorityPill.className = `pill ${priorityPillClass[ticket.priority]}`;

    const slaStatus = computeSlaStatus(ticket);
    els.slaPill.textContent = slaLabel[slaStatus];
    els.slaPill.className = `pill ${slaPillClass[slaStatus]}`;

    els.agent.textContent = ticket.assignedAgent || "Unassigned";
    els.updated.textContent = new Date(ticket.updatedAt).toLocaleString();

    els.assignSelect.value = ticket.assignedAgentId || "";
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

    renderCsat();
  }

  function renderCsat() {
    const isRateable = !isAgentOrAdmin && (ticket.status === "resolved" || ticket.status === "closed");

    if (!isRateable) {
      els.csatPrompt.hidden = true;
      els.csatResult.hidden = true;
      return;
    }

    if (ticket.csatRating) {
      els.csatPrompt.hidden = true;
      els.csatResult.hidden = false;
      els.csatResultValue.textContent = ticket.csatRating;
      els.csatResultComment.textContent = ticket.csatComment ? ` — "${ticket.csatComment}"` : "";
    } else {
      els.csatPrompt.hidden = false;
      els.csatResult.hidden = true;
    }
  }

  function renderAttachments() {
    els.attachment.innerHTML = "";
    if (ticket.attachments.length === 0) {
      els.attachment.textContent = "None";
      return;
    }
    ticket.attachments.forEach((a, i) => {
      const link = document.createElement("a");
      link.href = "#";
      link.className = "attachment-link";
      link.textContent = a.fileName;
      link.addEventListener("click", async (event) => {
        event.preventDefault();
        try {
          await downloadFile(`/tickets/${ticket.id}/attachments/${a.id}`, a.fileName);
        } catch (err) {
          detailErrorEl.textContent = err.message;
          detailErrorEl.hidden = false;
        }
      });
      els.attachment.appendChild(link);
      if (i < ticket.attachments.length - 1) els.attachment.appendChild(document.createElement("br"));
    });
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
          <span>${new Date(c.createdAt).toLocaleString()}</span>
        </div>
        <div>${c.comment}</div>
      `;
      els.commentsList.appendChild(div);
    });
  }

  function renderActivity() {
    els.activityList.innerHTML = "";
    if (ticket.history.length === 0) {
      els.activityList.innerHTML = `<p class="no-activity">No changes yet.</p>`;
      return;
    }
    ticket.history.forEach((h) => {
      const item = document.createElement("div");
      item.className = "activity-item";
      const label = FIELD_LABELS[h.field] || h.field;
      const from = formatHistoryValue(h.field, h.oldValue);
      const to = formatHistoryValue(h.field, h.newValue);
      item.innerHTML = `
        <span class="activity-dot"></span>
        <span class="activity-text"><strong>${h.changedBy}</strong> changed ${label} from <strong>${from}</strong> to <strong>${to}</strong></span>
        <span class="activity-time">${new Date(h.changedAt).toLocaleString()}</span>
      `;
      els.activityList.appendChild(item);
    });
  }

  async function patchTicket(body) {
    detailErrorEl.hidden = true;
    try {
      ticket = await apiFetch(`/tickets/${ticket.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      renderDynamicFields();
      renderActivity();
    } catch (err) {
      detailErrorEl.textContent = err.message;
      detailErrorEl.hidden = false;
    }
  }

  document.getElementById("assign-btn").addEventListener("click", () => {
    const value = els.assignSelect.value;
    patchTicket({ assignedTo: value ? Number(value) : "" });
  });

  document.getElementById("status-btn").addEventListener("click", () => {
    patchTicket({ status: els.statusSelect.value });
  });

  document.getElementById("priority-btn").addEventListener("click", () => {
    patchTicket({ priority: els.prioritySelect.value });
  });

  document.getElementById("resolve-btn").addEventListener("click", () => {
    patchTicket({ status: "resolved" });
  });

  document.getElementById("close-btn").addEventListener("click", () => {
    patchTicket({ status: "closed" });
  });

  els.reopenBtn.addEventListener("click", () => {
    patchTicket({ status: "in-progress" });
  });

  let selectedRating = null;
  els.csatStars.forEach((star) => {
    star.addEventListener("click", () => {
      selectedRating = Number(star.dataset.value);
      els.csatStars.forEach((s) => s.classList.toggle("selected", Number(s.dataset.value) <= selectedRating));
      els.csatSubmitBtn.disabled = false;
    });
  });

  els.csatSubmitBtn.addEventListener("click", async () => {
    if (!selectedRating) return;
    els.csatError.hidden = true;
    try {
      ticket = await apiFetch(`/tickets/${ticket.id}/csat`, {
        method: "POST",
        body: JSON.stringify({ rating: selectedRating, comment: els.csatComment.value.trim() || undefined }),
      });
      renderCsat();
    } catch (err) {
      els.csatError.textContent = err.message;
      els.csatError.hidden = false;
    }
  });

  document.getElementById("comment-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const textarea = document.getElementById("comment-text");
    const text = textarea.value.trim();
    if (!text) return;

    detailErrorEl.hidden = true;
    try {
      const newComment = await apiFetch(`/tickets/${ticket.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ comment: text }),
      });
      ticket.comments.push(newComment);
      textarea.value = "";
      renderComments();
    } catch (err) {
      detailErrorEl.textContent = err.message;
      detailErrorEl.hidden = false;
    }
  });

  renderStaticFields();
  renderDynamicFields();
  renderComments();
  renderActivity();
}
