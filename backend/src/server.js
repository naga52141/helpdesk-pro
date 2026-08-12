const express = require("express");
const cors = require("cors");

const lookupsRouter = require("./routes/lookups");
const ticketsRouter = require("./routes/tickets");
const dashboardRouter = require("./routes/dashboard");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "HelpDesk Pro API is running" });
});

app.use("/api", lookupsRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/dashboard", dashboardRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`HelpDesk Pro API listening on http://localhost:${PORT}`);
});
