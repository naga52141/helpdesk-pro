const pool = require("../config/db");
const { createNotification } = require("./notify");

const SYSTEM_USER_EMAIL = "system@helpdeskpro.local";
const ESCALATION = { low: "medium", medium: "high", high: "critical" };

async function getSystemUserId() {
  const [[user]] = await pool.query("SELECT id FROM users WHERE email = ?", [SYSTEM_USER_EMAIL]);
  return user ? user.id : null;
}

// Flags tickets that are open/in-progress and due within the next hour — once per ticket,
// so re-running this on a timer doesn't spam the same warning.
async function checkSlaWarnings() {
  const [atRisk] = await pool.query(
    `SELECT t.id, t.title, t.assigned_to
     FROM tickets t
     WHERE t.status IN ('open', 'in-progress')
       AND t.assigned_to IS NOT NULL
       AND t.sla_due_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 1 HOUR)
       AND NOT EXISTS (
         SELECT 1 FROM notifications n WHERE n.ticket_id = t.id AND n.type = 'sla_warning'
       )`
  );

  for (const ticket of atRisk) {
    await createNotification(ticket.assigned_to, ticket.id, "sla_warning", `SLA warning: T-${ticket.id} (${ticket.title}) is due within 1 hour`);
  }
}

// Tickets that are actually past their SLA deadline get their priority bumped up one
// level (capped at critical) as a visible, automatic escalation. This fires once per
// ticket — checked via the ticket_history trail — rather than re-escalating every time
// this job runs while the ticket stays overdue.
async function checkSlaBreaches() {
  const systemUserId = await getSystemUserId();
  if (!systemUserId) return; // seed hasn't run yet

  const [breached] = await pool.query(
    `SELECT t.id, t.title, t.priority, t.assigned_to
     FROM tickets t
     WHERE t.status IN ('open', 'in-progress')
       AND t.sla_due_at < NOW()
       AND t.priority IN ('low', 'medium', 'high')
       AND NOT EXISTS (
         SELECT 1 FROM ticket_history h
         WHERE h.ticket_id = t.id AND h.field = 'priority' AND h.changed_by = ?
       )`,
    [systemUserId]
  );

  for (const ticket of breached) {
    const newPriority = ESCALATION[ticket.priority];

    await pool.query("UPDATE tickets SET priority = ? WHERE id = ?", [newPriority, ticket.id]);
    await pool.query(
      "INSERT INTO ticket_history (ticket_id, changed_by, field, old_value, new_value) VALUES (?, ?, 'priority', ?, ?)",
      [ticket.id, systemUserId, ticket.priority, newPriority]
    );

    if (ticket.assigned_to) {
      await createNotification(
        ticket.assigned_to,
        ticket.id,
        "sla_breach",
        `SLA breached: T-${ticket.id} (${ticket.title}) auto-escalated to ${newPriority} priority`
      );
    }
  }
}

module.exports = { checkSlaWarnings, checkSlaBreaches };
