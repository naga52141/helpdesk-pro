const pool = require("../config/db");
const { emitToUser } = require("../socket");

async function createNotification(userId, ticketId, type, message) {
  const [result] = await pool.query(
    "INSERT INTO notifications (user_id, ticket_id, type, message) VALUES (?, ?, ?, ?)",
    [userId, ticketId, type, message]
  );
  emitToUser(userId, "notification:new", { id: result.insertId });
}

module.exports = { createNotification };
