const express = require("express");
const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /api/dashboard/stats — scoped by the logged-in user's role, not client-supplied params
router.get("/stats", requireAuth, asyncHandler(async (req, res) => {
  const { role, id: userId } = req.user;

  let whereClause = "";
  let params = [];

  if (role === "user") {
    whereClause = "WHERE t.created_by = ?";
    params = [userId];
  } else if (role === "agent") {
    whereClause = "WHERE t.assigned_to = ?";
    params = [userId];
  }
  // role === "admin": no filter, org-wide view

  const [[stats]] = await pool.query(
    `SELECT
       COUNT(*) AS total,
       SUM(t.status = 'open') AS open,
       SUM(t.status = 'in-progress') AS inProgress,
       SUM(t.status = 'resolved') AS resolved,
       SUM(t.priority IN ('high', 'critical')) AS highCritical,
       SUM(t.status IN ('open', 'in-progress') AND t.sla_due_at < NOW()) AS slaBreaches
     FROM tickets t
     ${whereClause}`,
    params
  );

  const numericStats = {
    total: Number(stats.total),
    open: Number(stats.open),
    inProgress: Number(stats.inProgress),
    resolved: Number(stats.resolved),
    highCritical: Number(stats.highCritical),
    slaBreaches: Number(stats.slaBreaches),
  };

  const [recentTickets] = await pool.query(
    `SELECT t.id, CONCAT('T-', t.id) AS displayId, t.title, t.priority, t.status,
            c.name AS category, u.name AS assignedAgent, t.updated_at AS updatedAt
     FROM tickets t
     JOIN categories c ON t.category_id = c.id
     LEFT JOIN users u ON t.assigned_to = u.id
     ${whereClause}
     ORDER BY t.updated_at DESC
     LIMIT 5`,
    params
  );

  res.json({ stats: numericStats, recentTickets });
}));

module.exports = router;
