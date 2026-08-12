const express = require("express");
const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
const adminOnly = [requireAuth, requireRole("admin")];

router.get("/categories", asyncHandler(async (req, res) => {
  const [rows] = await pool.query("SELECT id, name FROM categories ORDER BY name");
  res.json(rows);
}));

router.get("/departments", asyncHandler(async (req, res) => {
  const [rows] = await pool.query("SELECT id, name FROM departments ORDER BY name");
  res.json(rows);
}));

router.get("/agents", asyncHandler(async (req, res) => {
  const [rows] = await pool.query("SELECT id, name, email FROM users WHERE role = 'agent' ORDER BY name");
  res.json(rows);
}));

// Categories and departments are both just { id, name } with a uniqueness constraint,
// so the CRUD for each is identical apart from the table name — one helper, two callers.
function registerNameTableRoutes(path, table, label) {
  router.post(path, ...adminOnly, asyncHandler(async (req, res) => {
    const name = (req.body.name || "").trim();
    if (!name) return res.status(400).json({ error: `${label} name is required` });

    try {
      const [result] = await pool.query(`INSERT INTO ${table} (name) VALUES (?)`, [name]);
      res.status(201).json({ id: result.insertId, name });
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ error: `A ${label.toLowerCase()} with that name already exists` });
      }
      throw err;
    }
  }));

  router.patch(`${path}/:id`, ...adminOnly, asyncHandler(async (req, res) => {
    const name = (req.body.name || "").trim();
    if (!name) return res.status(400).json({ error: `${label} name is required` });

    const [[existing]] = await pool.query(`SELECT id FROM ${table} WHERE id = ?`, [req.params.id]);
    if (!existing) return res.status(404).json({ error: `${label} not found` });

    try {
      await pool.query(`UPDATE ${table} SET name = ? WHERE id = ?`, [name, req.params.id]);
      res.json({ id: Number(req.params.id), name });
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ error: `A ${label.toLowerCase()} with that name already exists` });
      }
      throw err;
    }
  }));

  router.delete(`${path}/:id`, ...adminOnly, asyncHandler(async (req, res) => {
    const [[existing]] = await pool.query(`SELECT id FROM ${table} WHERE id = ?`, [req.params.id]);
    if (!existing) return res.status(404).json({ error: `${label} not found` });

    try {
      await pool.query(`DELETE FROM ${table} WHERE id = ?`, [req.params.id]);
      res.status(204).end();
    } catch (err) {
      if (err.code === "ER_ROW_IS_REFERENCED_2" || err.code === "ER_ROW_IS_REFERENCED") {
        return res.status(409).json({ error: `Can't delete — tickets still reference this ${label.toLowerCase()}` });
      }
      throw err;
    }
  }));
}

registerNameTableRoutes("/categories", "categories", "Category");
registerNameTableRoutes("/departments", "departments", "Department");

module.exports = router;
