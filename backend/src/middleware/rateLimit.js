const rateLimit = require("express-rate-limit");

// The window is rolling, so repeated local/CI test runs within the same few minutes
// all share one counter per IP (~30 login calls per run and growing as the suite does)
// — sized generously enough to survive several back-to-back runs while still cutting
// off real credential stuffing, which needs far more than this per IP to be effective.
// Tighten this for a real production deployment with real accounts at stake.
const authRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait a few minutes and try again." },
});

module.exports = { authRateLimiter };
