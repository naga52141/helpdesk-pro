const express = require("express");
const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth");
const { isPositiveInt } = require("../utils/validate");

const router = express.Router();
router.use(requireAuth);
const staffOnly = requireRole("agent", "admin");

// GET /api/articles — list with optional search/category filters. Everyone can browse
// the knowledge base, not just staff — the whole point is letting users self-serve.
router.get("/", asyncHandler(async (req, res) => {
  const { search, category } = req.query;
  const conditions = [];
  const params = [];

  if (category) {
    conditions.push("c.name = ?");
    params.push(category);
  }
  if (search) {
    // Matched word-by-word rather than as one literal phrase — callers here include the
    // new-ticket page searching with a whole sentence-length title, and a naive
    // `LIKE %whole phrase%` almost never matches a short article title. Short filler
    // words (the, to, is...) are dropped so they don't wash out the real keywords, but
    // a lone short word (e.g. searching just "VPN") is kept since there's nothing else to go on.
    const rawTokens = search.split(/\s+/).map((t) => t.trim()).filter(Boolean);
    const meaningfulTokens = rawTokens.length > 1 ? rawTokens.filter((t) => t.length >= 4) : rawTokens;
    const tokens = meaningfulTokens.length > 0 ? meaningfulTokens : rawTokens;

    conditions.push(`(${tokens.map(() => "(a.title LIKE ? OR a.content LIKE ?)").join(" OR ")})`);
    tokens.forEach((t) => params.push(`%${t}%`, `%${t}%`));
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows] = await pool.query(
    `SELECT a.id, a.title, c.name AS category, u.name AS author,
            a.created_at AS createdAt, a.updated_at AS updatedAt,
            LEFT(a.content, 160) AS excerpt
     FROM articles a
     JOIN categories c ON a.category_id = c.id
     JOIN users u ON a.created_by = u.id
     ${whereClause}
     ORDER BY a.updated_at DESC`,
    params
  );
  res.json(rows);
}));

// GET /api/articles/:id
router.get("/:id", asyncHandler(async (req, res) => {
  const [[article]] = await pool.query(
    `SELECT a.id, a.title, a.content, c.id AS categoryId, c.name AS category,
            u.name AS author, a.created_at AS createdAt, a.updated_at AS updatedAt
     FROM articles a
     JOIN categories c ON a.category_id = c.id
     JOIN users u ON a.created_by = u.id
     WHERE a.id = ?`,
    [req.params.id]
  );
  if (!article) return res.status(404).json({ error: "Article not found" });
  res.json(article);
}));

// POST /api/articles — agent/admin only
router.post("/", staffOnly, asyncHandler(async (req, res) => {
  const { title, content, categoryId } = req.body;

  if (!title || !content || !categoryId) {
    return res.status(400).json({ error: "title, content, and categoryId are required" });
  }
  if (!isPositiveInt(categoryId)) {
    return res.status(400).json({ error: "categoryId must be a valid id" });
  }

  const [result] = await pool.query(
    "INSERT INTO articles (title, content, category_id, created_by) VALUES (?, ?, ?, ?)",
    [title, content, categoryId, req.user.id]
  );
  res.status(201).json({ id: result.insertId });
}));

// PATCH /api/articles/:id — agent/admin only
router.patch("/:id", staffOnly, asyncHandler(async (req, res) => {
  const { title, content, categoryId } = req.body;

  const [[existing]] = await pool.query("SELECT id FROM articles WHERE id = ?", [req.params.id]);
  if (!existing) return res.status(404).json({ error: "Article not found" });

  const updates = [];
  const params = [];
  if (title) {
    updates.push("title = ?");
    params.push(title);
  }
  if (content) {
    updates.push("content = ?");
    params.push(content);
  }
  if (categoryId) {
    if (!isPositiveInt(categoryId)) {
      return res.status(400).json({ error: "categoryId must be a valid id" });
    }
    updates.push("category_id = ?");
    params.push(categoryId);
  }
  if (updates.length === 0) {
    return res.status(400).json({ error: "Nothing to update" });
  }

  await pool.query(`UPDATE articles SET ${updates.join(", ")} WHERE id = ?`, [...params, req.params.id]);
  res.json({ message: "Article updated" });
}));

// DELETE /api/articles/:id — agent/admin only
router.delete("/:id", staffOnly, asyncHandler(async (req, res) => {
  const [[existing]] = await pool.query("SELECT id FROM articles WHERE id = ?", [req.params.id]);
  if (!existing) return res.status(404).json({ error: "Article not found" });

  await pool.query("DELETE FROM articles WHERE id = ?", [req.params.id]);
  res.status(204).end();
}));

module.exports = router;
