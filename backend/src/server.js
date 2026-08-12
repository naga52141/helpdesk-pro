const express = require("express");
const cors = require("cors");

const authRouter = require("./routes/auth");
const lookupsRouter = require("./routes/lookups");
const ticketsRouter = require("./routes/tickets");
const dashboardRouter = require("./routes/dashboard");
const analyticsRouter = require("./routes/analytics");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "HelpDesk Pro API is running" });
});

app.use("/api/auth", authRouter);
app.use("/api", lookupsRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/analytics", analyticsRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`HelpDesk Pro API listening on http://localhost:${PORT}`);
});
