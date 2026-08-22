const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const { createNotification } = require("../utils/notify");
const { isOneOf, isPositiveInt } = require("../utils/validate");
const { emitToStaff, emitToTicket } = require("../socket");

const PRIORITIES = ["low", "medium", "high", "critical"];
const STATUSES = ["open", "in-progress", "resolved", "closed"];

const router = express.Router();
router.use(requireAuth);

const UPLOADS_DIR = path.join(__dirname, "../../uploads");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    // Never trust the client's filename for the on-disk name — random name avoids
    // collisions and path traversal; the original name is kept in the DB for display.
    filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});

function uploadSingle(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      const message = err.code === "LIMIT_FILE_SIZE" ? "File must be 5MB or smaller" : err.message;
      return res.status(400).json({ error: message });
    }
    if (err) return next(err);
    next();
  });
}

async function getTicketDetail(id) {
  const [rows] = await pool.query(
    `SELECT t.id, CONCAT('T-', t.id) AS displayId, t.title, t.description, t.priority, t.status,
            t.created_by AS createdById,
            c.name AS category, d.name AS department,
            u.id AS assignedAgentId, u.name AS assignedAgent,
            cu.name AS requesterName, cu.email AS requesterEmail,
            t.device_info AS deviceInfo,
            t.created_at AS createdAt, t.updated_at AS updatedAt, t.sla_due_at AS slaDueAt,
            t.resolved_at AS resolvedAt, t.closed_at AS closedAt,
            t.csat_rating AS csatRating, t.csat_comment AS csatComment, t.csat_submitted_at AS csatSubmittedAt
     FROM tickets t
     JOIN categories c ON t.category_id = c.id
     JOIN departments d ON t.department_id = d.id
     LEFT JOIN users u ON t.assigned_to = u.id
     JOIN users cu ON t.created_by = cu.id
     WHERE t.id = ?`,
    [id]
  );
  const ticket = rows[0];
  if (!ticket) return null;

  const [comments] = await pool.query(
    `SELECT c.id, c.comment, c.created_at AS createdAt, u.name AS author, u.role
     FROM comments c JOIN users u ON c.user_id = u.id
     WHERE c.ticket_id = ? ORDER BY c.created_at ASC`,
    [id]
  );

  const [history] = await pool.query(
    `SELECT h.id, h.field, h.old_value AS oldValue, h.new_value AS newValue, h.changed_at AS changedAt, u.name AS changedBy
     FROM ticket_history h JOIN users u ON h.changed_by = u.id
     WHERE h.ticket_id = ? ORDER BY h.changed_at ASC`,
    [id]
  );

  const [attachments] = await pool.query(
    `SELECT a.id, a.file_name AS fileName, a.created_at AS createdAt, u.name AS uploadedBy
     FROM attachments a JOIN users u ON a.uploaded_by = u.id
     WHERE a.ticket_id = ? ORDER BY a.created_at ASC`,
    [id]
  );

  return { ...ticket, comments, history, attachments };
}

function canAccessTicket(user, createdById) {
  return user.role === "agent" || user.role === "admin" || createdById === user.id;
}

// GET /api/tickets — list with optional filters
router.get("/", asyncHandler(async (req, res) => {
  const { status, priority, category, assignedAgent, search, scope } = req.query;
  const { id: userId, role } = req.user;

  const conditions = [];
  const params = [];

  if (status) {
    conditions.push("t.status = ?");
    params.push(status);
  }
  if (priority) {
    conditions.push("t.priority = ?");
    params.push(priority);
  }
  if (category) {
    conditions.push("c.name = ?");
    params.push(category);
  }
  if (assignedAgent === "Unassigned") {
    conditions.push("t.assigned_to IS NULL");
  } else if (assignedAgent) {
    conditions.push("u.name = ?");
    params.push(assignedAgent);
  }
  if (search) {
    conditions.push("(t.title LIKE ? OR CONCAT('T-', t.id) LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  // Regular users can only ever see their own tickets — enforced server-side,
  // not just by what the frontend chooses to ask for.
  if (role === "user") {
    conditions.push("t.created_by = ?");
    params.push(userId);
  } else if (scope === "assigned") {
    conditions.push("t.assigned_to = ?");
    params.push(userId);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows] = await pool.query(
    `SELECT t.id, CONCAT('T-', t.id) AS displayId, t.title, t.priority, t.status,
            c.name AS category, d.name AS department, u.name AS assignedAgent,
            t.sla_due_at AS slaDueAt, t.updated_at AS updatedAt
     FROM tickets t
     JOIN categories c ON t.category_id = c.id
     JOIN departments d ON t.department_id = d.id
     LEFT JOIN users u ON t.assigned_to = u.id
     ${whereClause}
     ORDER BY t.updated_at DESC`,
    params
  );

  res.json(rows);
}));

// GET /api/tickets/:id — full detail with comments
router.get("/:id", asyncHandler(async (req, res) => {
  const ticket = await getTicketDetail(req.params.id);
  if (!ticket || !canAccessTicket(req.user, ticket.createdById)) {
    return res.status(404).json({ error: "Ticket not found" });
  }
  res.json(ticket);
}));

// POST /api/tickets — create a ticket
router.post("/", asyncHandler(async (req, res) => {
  const { title, description, categoryId, priority, departmentId, assignedTo, deviceInfo } = req.body;

  if (!title || !description || !categoryId || !priority || !departmentId) {
    return res.status(400).json({ error: "title, description, categoryId, priority, departmentId are required" });
  }
  if (!isOneOf(priority, PRIORITIES)) {
    return res.status(400).json({ error: `priority must be one of ${PRIORITIES.join(", ")}` });
  }
  if (!isPositiveInt(categoryId) || !isPositiveInt(departmentId)) {
    return res.status(400).json({ error: "categoryId and departmentId must be valid ids" });
  }
  if (assignedTo !== undefined && assignedTo !== null && !isPositiveInt(assignedTo)) {
    return res.status(400).json({ error: "assignedTo must be a valid id" });
  }

  const [[slaRule]] = await pool.query("SELECT resolution_hours FROM sla_rules WHERE priority = ?", [priority]);
  const resolutionHours = slaRule ? slaRule.resolution_hours : 72;

  const [result] = await pool.query(
    `INSERT INTO tickets (title, description, category_id, priority, department_id, created_by, assigned_to, device_info, sla_due_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))`,
    [title, description, categoryId, priority, departmentId, req.user.id, assignedTo || null, deviceInfo || null, resolutionHours]
  );

  const ticket = await getTicketDetail(result.insertId);
  emitToStaff("ticket:changed", { id: ticket.id });
  res.status(201).json(ticket);
}));

// PATCH /api/tickets/:id — update status, priority, or assignment
router.patch("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, priority, assignedTo } = req.body;
  const { role, id: userId } = req.user;

  if (status !== undefined && !isOneOf(status, STATUSES)) {
    return res.status(400).json({ error: `status must be one of ${STATUSES.join(", ")}` });
  }
  if (priority !== undefined && !isOneOf(priority, PRIORITIES)) {
    return res.status(400).json({ error: `priority must be one of ${PRIORITIES.join(", ")}` });
  }
  if (assignedTo !== undefined && assignedTo !== null && assignedTo !== "" && !isPositiveInt(assignedTo)) {
    return res.status(400).json({ error: "assignedTo must be a valid id" });
  }

  const [[existing]] = await pool.query("SELECT title, status, priority, assigned_to, created_by FROM tickets WHERE id = ?", [id]);
  if (!existing) return res.status(404).json({ error: "Ticket not found" });

  const isAgentOrAdmin = role === "agent" || role === "admin";

  if (!isAgentOrAdmin) {
    // End users may only reopen their own resolved ticket — nothing else.
    const isOwnTicket = existing.created_by === userId;
    const isReopenAttempt = status === "in-progress" && existing.status === "resolved";
    const onlyChangingStatus = priority === undefined && assignedTo === undefined;

    if (!isOwnTicket || !isReopenAttempt || !onlyChangingStatus) {
      return res.status(403).json({ error: "You don't have permission to do that" });
    }
  }

  const updates = [];
  const params = [];
  const historyEntries = [];

  if (status && status !== existing.status) {
    updates.push("status = ?");
    params.push(status);
    if (status === "resolved") {
      updates.push("resolved_at = NOW()");
    } else if (status === "closed") {
      updates.push("closed_at = NOW()");
    } else {
      updates.push("resolved_at = NULL", "closed_at = NULL");
    }
    historyEntries.push(["status", existing.status, status]);
  }

  if (priority && priority !== existing.priority) {
    updates.push("priority = ?");
    params.push(priority);
    historyEntries.push(["priority", existing.priority, priority]);
  }

  if (assignedTo !== undefined) {
    const newAssignedTo = assignedTo || null;
    if (newAssignedTo !== existing.assigned_to) {
      updates.push("assigned_to = ?");
      params.push(newAssignedTo);

      // Store names, not raw ids — the history log is for reading, not for joining.
      const [oldName, newName] = await Promise.all([
        existing.assigned_to
          ? pool.query("SELECT name FROM users WHERE id = ?", [existing.assigned_to]).then(([rows]) => rows[0]?.name)
          : null,
        newAssignedTo
          ? pool.query("SELECT name FROM users WHERE id = ?", [newAssignedTo]).then(([rows]) => rows[0]?.name)
          : null,
      ]);
      historyEntries.push(["assigned_to", oldName || "Unassigned", newName || "Unassigned"]);
    }
  }

  if (updates.length === 0) {
    return res.json(await getTicketDetail(id));
  }

  await pool.query(`UPDATE tickets SET ${updates.join(", ")} WHERE id = ?`, [...params, id]);

  for (const [field, oldValue, newValue] of historyEntries) {
    await pool.query(
      "INSERT INTO ticket_history (ticket_id, changed_by, field, old_value, new_value) VALUES (?, ?, ?, ?, ?)",
      [id, userId, field, oldValue, newValue]
    );
  }

  const displayId = `T-${id}`;

  if (assignedTo && Number(assignedTo) !== existing.assigned_to && Number(assignedTo) !== userId) {
    await createNotification(Number(assignedTo), id, "assigned", `You were assigned to ${displayId}: ${existing.title}`);
  }

  if (status && status !== existing.status && existing.created_by !== userId) {
    await createNotification(existing.created_by, id, "status_change", `${displayId} status changed to ${status.replace("-", " ")}`);
  }

  emitToStaff("ticket:changed", { id: Number(id) });
  emitToTicket(id, "ticket:changed", { id: Number(id) });

  res.json(await getTicketDetail(id));
}));

// POST /api/tickets/:id/comments — add a comment
router.post("/:id/comments", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;

  if (!comment) {
    return res.status(400).json({ error: "comment is required" });
  }

  const [[ticket]] = await pool.query("SELECT id, title, created_by, assigned_to FROM tickets WHERE id = ?", [id]);
  if (!ticket || !canAccessTicket(req.user, ticket.created_by)) {
    return res.status(404).json({ error: "Ticket not found" });
  }

  const [result] = await pool.query(
    "INSERT INTO comments (ticket_id, user_id, comment) VALUES (?, ?, ?)",
    [id, req.user.id, comment]
  );

  const [[newComment]] = await pool.query(
    `SELECT c.id, c.comment, c.created_at AS createdAt, u.name AS author, u.role
     FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?`,
    [result.insertId]
  );

  // Notify whichever side of the conversation didn't just post.
  const displayId = `T-${id}`;
  const notifyTargets = new Set([ticket.created_by, ticket.assigned_to].filter((uid) => uid && uid !== req.user.id));
  for (const targetUserId of notifyTargets) {
    await createNotification(targetUserId, id, "comment", `New comment on ${displayId}: ${ticket.title}`);
  }

  emitToTicket(id, "ticket:changed", { id: Number(id) });

  res.status(201).json(newComment);
}));

// POST /api/tickets/:id/csat — the requester rates a resolved/closed ticket, once
router.post("/:id/csat", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  const ratingNum = Number(rating);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ error: "rating must be an integer from 1 to 5" });
  }

  const [[ticket]] = await pool.query(
    "SELECT id, created_by, status, csat_rating FROM tickets WHERE id = ?",
    [id]
  );
  if (!ticket || ticket.created_by !== req.user.id) {
    return res.status(404).json({ error: "Ticket not found" });
  }
  if (ticket.status !== "resolved" && ticket.status !== "closed") {
    return res.status(400).json({ error: "You can only rate a resolved or closed ticket" });
  }
  if (ticket.csat_rating !== null) {
    return res.status(409).json({ error: "This ticket has already been rated" });
  }

  await pool.query(
    "UPDATE tickets SET csat_rating = ?, csat_comment = ?, csat_submitted_at = NOW() WHERE id = ?",
    [ratingNum, comment || null, id]
  );

  res.json(await getTicketDetail(id));
}));

// POST /api/tickets/:id/attachments — upload a file to a ticket
router.post("/:id/attachments", uploadSingle, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [[ticket]] = await pool.query("SELECT id, created_by FROM tickets WHERE id = ?", [id]);
  if (!ticket || !canAccessTicket(req.user, ticket.created_by)) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(404).json({ error: "Ticket not found" });
  }
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const [result] = await pool.query(
    "INSERT INTO attachments (ticket_id, file_name, file_path, uploaded_by) VALUES (?, ?, ?, ?)",
    [id, req.file.originalname, req.file.filename, req.user.id]
  );

  const [[attachment]] = await pool.query(
    `SELECT a.id, a.file_name AS fileName, a.created_at AS createdAt, u.name AS uploadedBy
     FROM attachments a JOIN users u ON a.uploaded_by = u.id WHERE a.id = ?`,
    [result.insertId]
  );

  res.status(201).json(attachment);
}));

// GET /api/tickets/:id/attachments/:attachmentId — download a file
router.get("/:id/attachments/:attachmentId", asyncHandler(async (req, res) => {
  const { id, attachmentId } = req.params;

  const [[ticket]] = await pool.query("SELECT id, created_by FROM tickets WHERE id = ?", [id]);
  if (!ticket || !canAccessTicket(req.user, ticket.created_by)) {
    return res.status(404).json({ error: "Ticket not found" });
  }

  const [[attachment]] = await pool.query(
    "SELECT file_name, file_path FROM attachments WHERE id = ? AND ticket_id = ?",
    [attachmentId, id]
  );
  if (!attachment) return res.status(404).json({ error: "Attachment not found" });

  res.download(path.join(UPLOADS_DIR, attachment.file_path), attachment.file_name);
}));

module.exports = router;
