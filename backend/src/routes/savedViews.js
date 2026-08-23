const express = require("express");
const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// GET /api/saved-views — the caller's own views only, oldest first
router.get("/", asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    "SELECT id, name, filters FROM saved_views WHERE user_id = ? ORDER BY created_at ASC",
    [req.user.id]
  );
  res.json(rows.map((r) => ({ id: r.id, name: r.name, filters: JSON.parse(r.filters) })));
}));

// POST /api/saved-views — save the current filter set under a name
router.post("/", asyncHandler(async (req, res) => {
  const name = (req.body.name || "").trim();
  const { filters } = req.body;

  if (!name) return res.status(400).json({ error: "View name is required" });
  if (!filters || typeof filters !== "object" || Array.isArray(filters)) {
    return res.status(400).json({ error: "filters must be an object" });
  }

  const [result] = await pool.query(
    "INSERT INTO saved_views (user_id, name, filters) VALUES (?, ?, ?)",
    [req.user.id, name, JSON.stringify(filters)]
  );
  res.status(201).json({ id: result.insertId, name, filters });
}));

// DELETE /api/saved-views/:id — only the owner can delete their own view
router.delete("/:id", asyncHandler(async (req, res) => {
  const [[existing]] = await pool.query(
    "SELECT id FROM saved_views WHERE id = ? AND user_id = ?",
    [req.params.id, req.user.id]
  );
  if (!existing) return res.status(404).json({ error: "Saved view not found" });

  await pool.query("DELETE FROM saved_views WHERE id = ?", [req.params.id]);
  res.status(204).end();
}));

module.exports = router;
