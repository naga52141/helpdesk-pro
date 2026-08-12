const express = require("express");
const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth, requireRole("admin"));

const VALID_ROLES = ["user", "agent", "admin"];

// GET /api/users — list every account (admin only)
router.get("/", asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, d.name AS department, u.created_at AS createdAt
     FROM users u
     LEFT JOIN departments d ON u.department_id = d.id
     ORDER BY FIELD(u.role, 'admin', 'agent', 'user'), u.name`
  );
  res.json(rows);
}));

// PATCH /api/users/:id — change a user's role
router.patch("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of ${VALID_ROLES.join(", ")}` });
  }
  if (Number(id) === req.user.id) {
    return res.status(400).json({ error: "You can't change your own role" });
  }

  const [[existing]] = await pool.query("SELECT id FROM users WHERE id = ?", [id]);
  if (!existing) return res.status(404).json({ error: "User not found" });

  await pool.query("UPDATE users SET role = ? WHERE id = ?", [role, id]);

  const [[updated]] = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, d.name AS department, u.created_at AS createdAt
     FROM users u LEFT JOIN departments d ON u.department_id = d.id WHERE u.id = ?`,
    [id]
  );
  res.json(updated);
}));

module.exports = router;
