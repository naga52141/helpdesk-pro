const express = require("express");
const Groq = require("groq-sdk");
const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const { assistantRateLimiter } = require("../middleware/rateLimit");

const router = express.Router();
router.use(requireAuth);

// llama-3.3-70b-versatile was retired from Groq's lineup — gpt-oss-120b is the current
// free-tier model with tool-calling support ("tools" in its supported_features).
const MODEL = "openai/gpt-oss-120b";
const MAX_TOOL_ROUNDS = 4;

let groq = null;
function getGroqClient() {
  if (!process.env.GROQ_API_KEY) return null;
  if (!groq) groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return groq;
}

// ---- Read-only tools. Each one scopes its query to the calling user's role, mirroring
// the same access rules the regular ticket routes already enforce — the assistant never
// gets a wider view of the data than the user already has in the UI. ----

async function toolGetTickets(user, args = {}) {
  const conditions = [];
  const params = [];

  if (user.role === "user") {
    conditions.push("t.created_by = ?");
    params.push(user.id);
  } else if (user.role === "agent") {
    conditions.push("t.assigned_to = ?");
    params.push(user.id);
  }
  // admins see everything, matching their existing unrestricted view elsewhere in the app.

  if (args.status) {
    conditions.push("t.status = ?");
    params.push(args.status);
  }
  if (args.priority) {
    conditions.push("t.priority = ?");
    params.push(args.priority);
  }
  if (args.overdueOnly) {
    conditions.push("t.sla_due_at < NOW() AND t.status IN ('open', 'in-progress')");
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const [rows] = await pool.query(
    `SELECT CONCAT('T-', t.id) AS displayId, t.title, t.status, t.priority,
            c.name AS category, t.sla_due_at AS slaDueAt, u.name AS assignedAgent, t.updated_at AS updatedAt
     FROM tickets t
     JOIN categories c ON t.category_id = c.id
     LEFT JOIN users u ON t.assigned_to = u.id
     ${whereClause}
     ORDER BY t.sla_due_at IS NULL, t.sla_due_at ASC
     LIMIT 30`,
    params
  );
  return rows;
}

async function toolGetTicketDetail(user, args = {}) {
  const idMatch = String(args.ticketId || "").match(/\d+/);
  if (!idMatch) return { error: "Invalid ticket id" };
  const id = idMatch[0];

  const [[ticket]] = await pool.query(
    `SELECT t.id, CONCAT('T-', t.id) AS displayId, t.title, t.description, t.status, t.priority,
            t.created_by AS createdById, c.name AS category, u.name AS assignedAgent,
            t.sla_due_at AS slaDueAt
     FROM tickets t
     JOIN categories c ON t.category_id = c.id
     LEFT JOIN users u ON t.assigned_to = u.id
     WHERE t.id = ?`,
    [id]
  );
  if (!ticket) return { error: "Ticket not found" };

  const canAccess = user.role === "agent" || user.role === "admin" || ticket.createdById === user.id;
  if (!canAccess) return { error: "You don't have access to this ticket" };
  delete ticket.createdById;

  const [comments] = await pool.query(
    `SELECT c.comment, c.created_at AS createdAt, u.name AS author
     FROM comments c JOIN users u ON c.user_id = u.id
     WHERE c.ticket_id = ? ORDER BY c.created_at ASC`,
    [id]
  );

  return { ...ticket, comments };
}

async function toolSearchKnowledgeBase(_user, args = {}) {
  if (!args.query) return [];
  const [rows] = await pool.query(
    "SELECT title, content FROM articles WHERE title LIKE ? OR content LIKE ? LIMIT 5",
    [`%${args.query}%`, `%${args.query}%`]
  );
  return rows.map((r) => ({ title: r.title, excerpt: r.content.slice(0, 300) }));
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_tickets",
      description:
        "List tickets relevant to the current user — their own submitted tickets if they're an end user, their assigned tickets if they're an agent, or all tickets if they're an admin. Supports optional filters.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["open", "in-progress", "resolved", "closed"] },
          priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
          overdueOnly: { type: "boolean", description: "Only tickets past their SLA deadline and still open" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_ticket_detail",
      description: "Get the full description and comment history for one specific ticket by its display id (e.g. 'T-12').",
      parameters: {
        type: "object",
        properties: { ticketId: { type: "string", description: "Ticket display id, e.g. T-12" } },
        required: ["ticketId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_knowledge_base",
      description: "Search knowledge base articles for troubleshooting guidance, useful for drafting replies or answering how-to questions.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
  },
];

const TOOL_IMPLS = {
  get_tickets: toolGetTickets,
  get_ticket_detail: toolGetTicketDetail,
  search_knowledge_base: toolSearchKnowledgeBase,
};

function systemPrompt(user) {
  return `You are the assistant built into HelpDesk Pro, an IT support ticketing system. You're helping ${user.name}, logged in as ${user.role === "admin" ? "an" : "a"} ${user.role}.

You have read-only tools to look up ticket and knowledge-base data — use them whenever a question needs real data rather than guessing. You cannot make any changes yourself (no closing, assigning, status changes, or posting comments) — if asked to do something like that, say you can't perform actions yet, but offer to draft the text they'd need so they can paste it in themselves.

Keep responses short and practical. When listing tickets, use their display id (e.g. T-12) and lead with whatever needs attention first.

Reply in plain text only — no markdown (no asterisks, no headings, no backticks). For a list, start each line with a dash and a space.`;
}

// POST /api/assistant/chat
router.post("/chat", assistantRateLimiter, asyncHandler(async (req, res) => {
  const client = getGroqClient();
  if (!client) {
    return res.status(503).json({ error: "The assistant isn't set up yet — ask your admin to add a Groq API key." });
  }

  const { message, history } = req.body;
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "message is required" });
  }
  if (history !== undefined && (!Array.isArray(history) || history.length > 20)) {
    return res.status(400).json({ error: "history must be an array of at most 20 messages" });
  }

  const messages = [
    { role: "system", content: systemPrompt(req.user) },
    ...(history || [])
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    let completion;
    try {
      completion = await client.chat.completions.create({
        model: MODEL,
        messages,
        tools: TOOLS,
        tool_choice: "auto",
        temperature: 0.3,
      });
    } catch (err) {
      console.error("Groq request failed:", err.message);
      return res.status(502).json({ error: "The assistant is temporarily unavailable. Please try again." });
    }

    const choice = completion.choices[0].message;
    messages.push(choice);

    if (!choice.tool_calls || choice.tool_calls.length === 0) {
      return res.json({ reply: choice.content });
    }

    for (const call of choice.tool_calls) {
      const impl = TOOL_IMPLS[call.function.name];
      let result;
      try {
        const args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
        result = impl ? await impl(req.user, args) : { error: "Unknown tool" };
      } catch (err) {
        result = { error: "Tool call failed" };
      }
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }

  res.json({ reply: "Sorry, I couldn't work that out in time — try asking in a simpler way." });
}));

module.exports = router;
