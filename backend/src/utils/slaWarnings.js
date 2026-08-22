const pool = require("../config/db");
const { createNotification } = require("./notify");

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

module.exports = { checkSlaWarnings };
