require("dotenv").config();
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "helpdeskpro",
  waitForConnections: true,
  connectionLimit: 10,
  // Most managed MySQL hosts (used in production, unlike local dev) require TLS.
  // rejectUnauthorized: false skips CA verification — acceptable for a demo deployment,
  // but swap in the host's actual CA certificate for anything more sensitive.
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

module.exports = pool;
