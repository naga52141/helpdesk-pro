const express = require("express");
const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth, requireRole("admin"));

// GET /api/audit-log — admin only, most recent first
router.get("/", asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT a.id, a.action, a.target_type AS targetType, a.target_id AS targetId, a.details,
            a.created_at AS createdAt, u.name AS actor
     FROM audit_log a
     JOIN users u ON a.actor_id = u.id
     ORDER BY a.created_at DESC
     LIMIT 200`
  );
  res.json(rows);
}));

module.exports = router;
