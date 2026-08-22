const express = require("express");
const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth, requireRole("agent", "admin"));

const PRIORITY_ORDER = ["low", "medium", "high", "critical"];

function lastNMonths(n) {
  const months = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

router.get("/summary", asyncHandler(async (req, res) => {
  const [byCategoryRows] = await pool.query(
    `SELECT c.name AS category, COUNT(*) AS count
     FROM tickets t JOIN categories c ON t.category_id = c.id
     GROUP BY c.name ORDER BY count DESC`
  );

  const [byPriorityRows] = await pool.query(
    `SELECT priority, COUNT(*) AS count FROM tickets GROUP BY priority`
  );
  const priorityCounts = Object.fromEntries(byPriorityRows.map((r) => [r.priority, Number(r.count)]));
  const byPriority = PRIORITY_ORDER.map((priority) => ({ priority, count: priorityCounts[priority] || 0 }));

  const [byMonthRows] = await pool.query(
    `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count
     FROM tickets
     WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
     GROUP BY month`
  );
  const monthCounts = Object.fromEntries(byMonthRows.map((r) => [r.month, Number(r.count)]));
  const byMonth = lastNMonths(6).map((month) => ({ month, count: monthCounts[month] || 0 }));

  const [[resolutionRow]] = await pool.query(
    `SELECT AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)) AS avgHours
     FROM tickets WHERE resolved_at IS NOT NULL`
  );
  const avgResolutionHours = resolutionRow.avgHours !== null ? Number(resolutionRow.avgHours) : null;

  const [[slaRow]] = await pool.query(
    `SELECT
       COUNT(*) AS total,
       SUM(resolved_at <= sla_due_at) AS met
     FROM tickets WHERE resolved_at IS NOT NULL`
  );
  const slaTotal = Number(slaRow.total);
  const slaMet = Number(slaRow.met) || 0;
  const slaCompliance = {
    total: slaTotal,
    met: slaMet,
    breached: slaTotal - slaMet,
    percentage: slaTotal > 0 ? Math.round((slaMet / slaTotal) * 1000) / 10 : null,
  };

  const [agentRows] = await pool.query(
    `SELECT
       u.id, u.name,
       COUNT(t.id) AS assigned,
       SUM(t.status IN ('resolved', 'closed')) AS resolved,
       AVG(CASE WHEN t.resolved_at IS NOT NULL THEN TIMESTAMPDIFF(HOUR, t.created_at, t.resolved_at) END) AS avgResolutionHours,
       SUM(CASE WHEN t.resolved_at IS NOT NULL THEN t.resolved_at <= t.sla_due_at END) AS slaMet,
       SUM(t.resolved_at IS NOT NULL) AS slaEligible,
       AVG(t.csat_rating) AS avgCsat
     FROM users u
     LEFT JOIN tickets t ON t.assigned_to = u.id
     WHERE u.role = 'agent'
     GROUP BY u.id, u.name
     ORDER BY resolved DESC`
  );

  const agentPerformance = agentRows.map((r) => ({
    agent: r.name,
    assigned: Number(r.assigned),
    resolved: Number(r.resolved) || 0,
    avgResolutionHours: r.avgResolutionHours !== null ? Number(r.avgResolutionHours) : null,
    slaCompliancePercentage: Number(r.slaEligible) > 0 ? Math.round((Number(r.slaMet) / Number(r.slaEligible)) * 1000) / 10 : null,
    avgCsat: r.avgCsat !== null ? Math.round(Number(r.avgCsat) * 10) / 10 : null,
  }));

  const [[csatRow]] = await pool.query(
    "SELECT COUNT(*) AS total, AVG(csat_rating) AS avgRating FROM tickets WHERE csat_rating IS NOT NULL"
  );
  const csat = {
    total: Number(csatRow.total),
    average: csatRow.avgRating !== null ? Math.round(Number(csatRow.avgRating) * 10) / 10 : null,
  };

  res.json({
    byCategory: byCategoryRows.map((r) => ({ category: r.category, count: Number(r.count) })),
    byPriority,
    byMonth,
    avgResolutionHours,
    slaCompliance,
    agentPerformance,
    csat,
  });
}));

module.exports = router;
