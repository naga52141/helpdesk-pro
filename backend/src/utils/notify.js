const pool = require("../config/db");

async function createNotification(userId, ticketId, type, message) {
  await pool.query(
    "INSERT INTO notifications (user_id, ticket_id, type, message) VALUES (?, ?, ?, ?)",
    [userId, ticketId, type, message]
  );
}

module.exports = { createNotification };
