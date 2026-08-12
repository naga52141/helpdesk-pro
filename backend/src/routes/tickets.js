const express = require("express");
const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

async function getTicketDetail(id) {
  const [rows] = await pool.query(
    `SELECT t.id, CONCAT('T-', t.id) AS displayId, t.title, t.description, t.priority, t.status,
            c.name AS category, d.name AS department,
            u.id AS assignedAgentId, u.name AS assignedAgent,
            cu.name AS requesterName, cu.email AS requesterEmail,
            t.device_info AS deviceInfo,
            t.created_at AS createdAt, t.updated_at AS updatedAt, t.sla_due_at AS slaDueAt,
            t.resolved_at AS resolvedAt, t.closed_at AS closedAt
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

  return { ...ticket, comments };
}

// GET /api/tickets — list with optional filters
router.get("/", asyncHandler(async (req, res) => {
  const { status, priority, category, assignedAgent, search, scope, userId } = req.query;

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
  if (scope === "mine" && userId) {
    conditions.push("t.created_by = ?");
    params.push(userId);
  } else if (scope === "assigned" && userId) {
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
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });
  res.json(ticket);
}));

// POST /api/tickets — create a ticket
router.post("/", asyncHandler(async (req, res) => {
  const { title, description, categoryId, priority, departmentId, createdBy, assignedTo, deviceInfo } = req.body;

  if (!title || !description || !categoryId || !priority || !departmentId || !createdBy) {
    return res.status(400).json({ error: "title, description, categoryId, priority, departmentId, createdBy are required" });
  }

  const [[slaRule]] = await pool.query("SELECT resolution_hours FROM sla_rules WHERE priority = ?", [priority]);
  const resolutionHours = slaRule ? slaRule.resolution_hours : 72;

  const [result] = await pool.query(
    `INSERT INTO tickets (title, description, category_id, priority, department_id, created_by, assigned_to, device_info, sla_due_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))`,
    [title, description, categoryId, priority, departmentId, createdBy, assignedTo || null, deviceInfo || null, resolutionHours]
  );

  const ticket = await getTicketDetail(result.insertId);
  res.status(201).json(ticket);
}));

// PATCH /api/tickets/:id — update status, priority, or assignment
router.patch("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, priority, assignedTo, changedBy } = req.body;

  const [[existing]] = await pool.query("SELECT status, priority, assigned_to FROM tickets WHERE id = ?", [id]);
  if (!existing) return res.status(404).json({ error: "Ticket not found" });

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
      historyEntries.push(["assigned_to", existing.assigned_to, newAssignedTo]);
    }
  }

  if (updates.length === 0) {
    return res.json(await getTicketDetail(id));
  }

  await pool.query(`UPDATE tickets SET ${updates.join(", ")} WHERE id = ?`, [...params, id]);

  if (changedBy) {
    for (const [field, oldValue, newValue] of historyEntries) {
      await pool.query(
        "INSERT INTO ticket_history (ticket_id, changed_by, field, old_value, new_value) VALUES (?, ?, ?, ?, ?)",
        [id, changedBy, field, oldValue, newValue]
      );
    }
  }

  res.json(await getTicketDetail(id));
}));

// POST /api/tickets/:id/comments — add a comment
router.post("/:id/comments", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId, comment } = req.body;

  if (!userId || !comment) {
    return res.status(400).json({ error: "userId and comment are required" });
  }

  const [[ticket]] = await pool.query("SELECT id FROM tickets WHERE id = ?", [id]);
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  const [result] = await pool.query(
    "INSERT INTO comments (ticket_id, user_id, comment) VALUES (?, ?, ?)",
    [id, userId, comment]
  );

  const [[newComment]] = await pool.query(
    `SELECT c.id, c.comment, c.created_at AS createdAt, u.name AS author, u.role
     FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?`,
    [result.insertId]
  );

  res.status(201).json(newComment);
}));

module.exports = router;
