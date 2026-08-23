// The frontend has no build step, so there's no way to inject an environment-specific
// API URL at deploy time — instead, detect whether we're running against the local dev
// backend or the deployed one based on the hostname the page itself was loaded from.
// If the Render backend service ends up on a different subdomain than expected (its
// chosen name was already taken), update HDPRO_BACKEND_URL below to match.
const HDPRO_IS_LOCAL = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const HDPRO_BACKEND_URL = HDPRO_IS_LOCAL
  ? "http://localhost:4000"
  : "https://helpdeskpro-backend.onrender.com";
