const express = require("express");
const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

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

module.exports = router;
