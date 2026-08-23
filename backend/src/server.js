const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");

const authRouter = require("./routes/auth");
const lookupsRouter = require("./routes/lookups");
const ticketsRouter = require("./routes/tickets");
const dashboardRouter = require("./routes/dashboard");
const analyticsRouter = require("./routes/analytics");
const usersRouter = require("./routes/users");
const slaRulesRouter = require("./routes/slaRules");
const notificationsRouter = require("./routes/notifications");
const articlesRouter = require("./routes/articles");
const cannedResponsesRouter = require("./routes/cannedResponses");
const { checkSlaWarnings, checkSlaBreaches } = require("./utils/slaWarnings");
const { initSocket } = require("./socket");

const app = express();
const PORT = process.env.PORT || 4000;

// crossOriginResourcePolicy is disabled — the frontend is served from a different origin
// and fetches JSON + downloads files from here, which the default same-origin policy blocks.
app.use(helmet({ crossOriginResourcePolicy: false }));
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
app.use("/api/users", usersRouter);
app.use("/api/sla-rules", slaRulesRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/articles", articlesRouter);
app.use("/api/canned-responses", cannedResponsesRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// A plain http.Server (rather than app.listen()'s implicit one) so Socket.IO can attach
// to the same server and share its port.
const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`HelpDesk Pro API listening on http://localhost:${PORT}`);
});

function runSlaChecks() {
  checkSlaWarnings().catch((err) => console.error("SLA warning check failed:", err));
  checkSlaBreaches().catch((err) => console.error("SLA breach check failed:", err));
}

runSlaChecks();
setInterval(runSlaChecks, 5 * 60 * 1000);
