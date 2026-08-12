// One-off script: sets a known password on all seeded demo accounts so they can be used to log in.
require("dotenv").config();
const bcrypt = require("bcrypt");
const pool = require("../src/config/db");

const DEMO_PASSWORD = "Password123!";

async function main() {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const [result] = await pool.query("UPDATE users SET password_hash = ?", [hash]);
  console.log(`Updated ${result.affectedRows} user(s). Demo password for all seeded accounts: ${DEMO_PASSWORD}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
