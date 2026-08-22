const express = require("express");
const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// GET /api/notifications — most recent first, plus an unread count for the bell badge
router.get("/", asyncHandler(async (req, res) => {
  const [notifications] = await pool.query(
    `SELECT n.id, n.type, n.message, n.is_read AS isRead, n.created_at AS createdAt,
            CONCAT('T-', n.ticket_id) AS ticketDisplayId
     FROM notifications n
     WHERE n.user_id = ?
     ORDER BY n.created_at DESC
     LIMIT 20`,
    [req.user.id]
  );

  const [[{ unreadCount }]] = await pool.query(
    "SELECT COUNT(*) AS unreadCount FROM notifications WHERE user_id = ? AND is_read = 0",
    [req.user.id]
  );

  res.json({ notifications, unreadCount: Number(unreadCount) });
}));

// PATCH /api/notifications/:id/read — mark one as read
router.patch("/:id/read", asyncHandler(async (req, res) => {
  const [result] = await pool.query(
    "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
    [req.params.id, req.user.id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: "Notification not found" });
  res.status(204).end();
}));

// POST /api/notifications/read-all
router.post("/read-all", asyncHandler(async (req, res) => {
  await pool.query("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0", [req.user.id]);
  res.status(204).end();
}));

module.exports = router;
