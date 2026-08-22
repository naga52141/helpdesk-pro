const pool = require("../config/db");
const { emitToUser } = require("../socket");
const { sendEmail } = require("./mailer");

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:8935";

async function createNotification(userId, ticketId, type, message) {
  const [result] = await pool.query(
    "INSERT INTO notifications (user_id, ticket_id, type, message) VALUES (?, ?, ?, ?)",
    [userId, ticketId, type, message]
  );
  emitToUser(userId, "notification:new", { id: result.insertId });

  const [[user]] = await pool.query("SELECT email FROM users WHERE id = ?", [userId]);
  if (user) {
    await sendEmail(
      user.email,
      "HelpDesk Pro notification",
      `<p>${message}</p><p><a href="${FRONTEND_URL}/ticket-detail.html?id=T-${ticketId}">View ticket</a></p>`
    );
  }
}

module.exports = { createNotification };
