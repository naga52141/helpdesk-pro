const pool = require("../config/db");

// Never lets a logging failure break the admin action that triggered it — same
// fault-tolerance stance as sendEmail in mailer.js.
async function logAudit(actorId, action, targetType, targetId, details) {
  try {
    await pool.query(
      "INSERT INTO audit_log (actor_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)",
      [actorId, action, targetType, targetId ?? null, details ?? null]
    );
  } catch (err) {
    console.error("Failed to write audit log entry:", err.message);
  }
}

module.exports = { logAudit };
