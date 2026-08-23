const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { authenticator } = require("otplib");
const QRCode = require("qrcode");

// otplib's default window is 0 — a code is only accepted in the exact current 30s tick,
// with zero tolerance for the small latency between generating and submitting it (or any
// clock drift). window: 1 accepts the previous/next step too, the standard tolerance.
authenticator.options = { window: 1 };
const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const { authRateLimiter } = require("../middleware/rateLimit");
const { isValidEmail, isPositiveInt } = require("../utils/validate");
const { sendEmail } = require("../utils/mailer");

const RESET_TOKEN_TTL_MINUTES = 30;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:8935";

// Deliberately distinct from JWT_SECRET so a pending-2FA token can never be mistaken for
// a real session token by requireAuth, which only ever verifies against JWT_SECRET —
// this is what stops the temp token from working as a general bearer token.
const TOTP_PENDING_SECRET = `${process.env.JWT_SECRET}:2fa-pending`;

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function signPendingTotpToken(userId) {
  return jwt.sign({ id: userId }, TOTP_PENDING_SECRET, { expiresIn: "5m" });
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, totpEnabled: Boolean(user.totp_enabled) };
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

  if (user.totp_enabled) {
    return res.json({ requiresTotp: true, tempToken: signPendingTotpToken(user.id) });
  }

  res.json({ token: signToken(user), user: publicUser(user) });
}));

// POST /api/auth/2fa/login — second step when /login responded with requiresTotp
router.post("/2fa/login", authRateLimiter, asyncHandler(async (req, res) => {
  const { tempToken, token } = req.body;

  if (!tempToken || !token) {
    return res.status(400).json({ error: "tempToken and token are required" });
  }

  let payload;
  try {
    payload = jwt.verify(tempToken, TOTP_PENDING_SECRET);
  } catch {
    return res.status(401).json({ error: "This login attempt has expired. Please log in again." });
  }

  const [[user]] = await pool.query("SELECT * FROM users WHERE id = ?", [payload.id]);
  if (!user || !user.totp_enabled) {
    return res.status(401).json({ error: "This login attempt has expired. Please log in again." });
  }

  if (!authenticator.check(token, user.totp_secret)) {
    return res.status(401).json({ error: "Invalid authentication code" });
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

// GET /api/auth/2fa/status
router.get("/2fa/status", requireAuth, asyncHandler(async (req, res) => {
  const [[user]] = await pool.query("SELECT totp_enabled FROM users WHERE id = ?", [req.user.id]);
  res.json({ enabled: Boolean(user.totp_enabled) });
}));

// POST /api/auth/2fa/setup — generates a new secret (not yet active) and returns enrollment
// material. Calling this again before /2fa/verify just replaces the pending secret.
router.post("/2fa/setup", requireAuth, asyncHandler(async (req, res) => {
  const secret = authenticator.generateSecret();
  await pool.query("UPDATE users SET totp_secret = ?, totp_enabled = 0 WHERE id = ?", [secret, req.user.id]);

  const otpauthUrl = authenticator.keyuri(req.user.email, "HelpDesk Pro", secret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

  res.json({ secret, otpauthUrl, qrCodeDataUrl });
}));

// POST /api/auth/2fa/verify — confirms enrollment with one real code from the
// authenticator app, then flips totp_enabled on.
router.post("/2fa/verify", requireAuth, asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "token is required" });

  const [[user]] = await pool.query("SELECT totp_secret FROM users WHERE id = ?", [req.user.id]);
  if (!user.totp_secret) {
    return res.status(400).json({ error: "Start setup first by requesting a QR code" });
  }
  if (!authenticator.check(token, user.totp_secret)) {
    return res.status(400).json({ error: "Invalid authentication code" });
  }

  await pool.query("UPDATE users SET totp_enabled = 1 WHERE id = ?", [req.user.id]);
  res.json({ enabled: true });
}));

// POST /api/auth/2fa/disable — requires the current password as a safety check, since
// this removes a security control from the account.
router.post("/2fa/disable", requireAuth, asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "password is required" });

  const [[user]] = await pool.query("SELECT password_hash FROM users WHERE id = ?", [req.user.id]);
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    // 400, not 401 — apiFetch treats any 401 while a session exists as an expired/invalid
    // bearer token and force-logs-out, which would hide this as a form error entirely.
    return res.status(400).json({ error: "Incorrect password" });
  }

  await pool.query("UPDATE users SET totp_secret = NULL, totp_enabled = 0 WHERE id = ?", [req.user.id]);
  res.json({ enabled: false });
}));

module.exports = router;
