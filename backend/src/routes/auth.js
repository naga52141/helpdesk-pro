const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const { authRateLimiter } = require("../middleware/rateLimit");
const { isValidEmail, isPositiveInt } = require("../utils/validate");

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

// POST /api/auth/register — self-registration always creates a 'user' role account
router.post("/register", authRateLimiter, asyncHandler(async (req, res) => {
  const { name, email, password, departmentId } = req.body;

  if (!name || !email || !password || !departmentId) {
    return res.status(400).json({ error: "name, email, password, and departmentId are required" });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Please enter a valid email address" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }
  if (!isPositiveInt(departmentId)) {
    return res.status(400).json({ error: "departmentId must be a valid id" });
  }

  const [[existing]] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
  if (existing) {
    return res.status(409).json({ error: "An account with that email already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [result] = await pool.query(
    "INSERT INTO users (name, email, password_hash, role, department_id) VALUES (?, ?, ?, 'user', ?)",
    [name, email, passwordHash, departmentId]
  );

  const user = { id: result.insertId, name, email, role: "user" };
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
}));

// POST /api/auth/login
router.post("/login", authRateLimiter, asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const [[user]] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  res.json({ token: signToken(user), user: publicUser(user) });
}));

// GET /api/auth/me — used by the frontend to validate a stored session
router.get("/me", requireAuth, asyncHandler(async (req, res) => {
  res.json({ user: req.user });
}));

module.exports = router;
