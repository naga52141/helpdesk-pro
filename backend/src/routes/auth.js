const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const { authRateLimiter } = require("../middleware/rateLimit");
const { isValidEmail, isPositiveInt } = require("../utils/validate");
const { sendEmail } = require("../utils/mailer");

const RESET_TOKEN_TTL_MINUTES = 30;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:8935";

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

// POST /api/auth/forgot-password — always returns the same generic message so the
// response can't be used to enumerate which emails have an account.
router.post("/forgot-password", authRateLimiter, asyncHandler(async (req, res) => {
  const { email } = req.body;
  const genericResponse = { message: "If an account exists for that email, a reset link has been generated." };

  if (!isValidEmail(email)) {
    return res.json(genericResponse);
  }

  const [[user]] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
  if (!user) {
    return res.json(genericResponse);
  }

  const token = crypto.randomBytes(32).toString("hex");
  await pool.query(
    "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))",
    [user.id, token, RESET_TOKEN_TTL_MINUTES]
  );

  const resetLink = `${FRONTEND_URL}/reset-password.html?token=${token}`;
  await sendEmail(
    email,
    "Reset your HelpDesk Pro password",
    `<p>Click the link below to reset your password. This link expires in ${RESET_TOKEN_TTL_MINUTES} minutes.</p>
     <p><a href="${resetLink}">${resetLink}</a></p>
     <p>If you didn't request this, you can ignore this email.</p>`
  );

  res.json(genericResponse);
}));

// POST /api/auth/reset-password
router.post("/reset-password", authRateLimiter, asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: "token and password are required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const [[resetToken]] = await pool.query(
    "SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token = ?",
    [token]
  );
  if (!resetToken || resetToken.used_at || new Date(resetToken.expires_at) < new Date()) {
    return res.status(400).json({ error: "This reset link is invalid or has expired" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, resetToken.user_id]);
  await pool.query("UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?", [resetToken.id]);

  res.json({ message: "Password updated. You can now log in with your new password." });
}));

module.exports = router;
