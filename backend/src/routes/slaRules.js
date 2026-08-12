const express = require("express");
const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth, requireRole("agent", "admin"));

// GET /api/sla-rules — agents can view; only admins can edit (see PATCH below)
router.get("/", asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    "SELECT priority, response_hours AS responseHours, resolution_hours AS resolutionHours FROM sla_rules ORDER BY FIELD(priority, 'critical', 'high', 'medium', 'low')"
  );
  res.json(rows);
}));

// PATCH /api/sla-rules/:priority — admin only
router.patch("/:priority", requireRole("admin"), asyncHandler(async (req, res) => {
  const { priority } = req.params;
  const { responseHours, resolutionHours } = req.body;

  const response = Number(responseHours);
  const resolution = Number(resolutionHours);

  if (!Number.isFinite(response) || response <= 0 || !Number.isFinite(resolution) || resolution <= 0) {
    return res.status(400).json({ error: "responseHours and resolutionHours must be positive numbers" });
  }
  if (response > resolution) {
    return res.status(400).json({ error: "Response time can't be longer than resolution time" });
  }

  const [result] = await pool.query(
    "UPDATE sla_rules SET response_hours = ?, resolution_hours = ? WHERE priority = ?",
    [response, resolution, priority]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: "Unknown priority" });

  res.json({ priority, responseHours: response, resolutionHours: resolution });
}));

module.exports = router;
