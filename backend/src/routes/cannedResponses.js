const express = require("express");
const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth");

// Every route here is an agent/admin productivity tool — regular users never see or
// use canned responses, so the whole router is staff-only rather than per-route.
const router = express.Router();
router.use(requireAuth, requireRole("agent", "admin"));

// GET /api/canned-responses
router.get("/", asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    "SELECT id, title, body, created_at AS createdAt FROM canned_responses ORDER BY title"
  );
  res.json(rows);
}));

// POST /api/canned-responses
router.post("/", asyncHandler(async (req, res) => {
  const { title, body } = req.body;

  if (!title || !body) {
    return res.status(400).json({ error: "title and body are required" });
  }

  const [result] = await pool.query(
    "INSERT INTO canned_responses (title, body, created_by) VALUES (?, ?, ?)",
    [title, body, req.user.id]
  );
  res.status(201).json({ id: result.insertId, title, body });
}));

// PATCH /api/canned-responses/:id
router.patch("/:id", asyncHandler(async (req, res) => {
  const { title, body } = req.body;

  const [[existing]] = await pool.query("SELECT id FROM canned_responses WHERE id = ?", [req.params.id]);
  if (!existing) return res.status(404).json({ error: "Canned response not found" });

  const updates = [];
  const params = [];
  if (title) {
    updates.push("title = ?");
    params.push(title);
  }
  if (body) {
    updates.push("body = ?");
    params.push(body);
  }
  if (updates.length === 0) {
    return res.status(400).json({ error: "Nothing to update" });
  }

  await pool.query(`UPDATE canned_responses SET ${updates.join(", ")} WHERE id = ?`, [...params, req.params.id]);
  res.json({ message: "Canned response updated" });
}));

// DELETE /api/canned-responses/:id
router.delete("/:id", asyncHandler(async (req, res) => {
  const [[existing]] = await pool.query("SELECT id FROM canned_responses WHERE id = ?", [req.params.id]);
  if (!existing) return res.status(404).json({ error: "Canned response not found" });

  await pool.query("DELETE FROM canned_responses WHERE id = ?", [req.params.id]);
  res.status(204).end();
}));

module.exports = router;
