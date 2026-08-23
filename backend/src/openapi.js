// Hand-written OpenAPI 3.0 document, served via swagger-ui-express at /api-docs.
// Kept as a plain JS module (not YAML) so no extra parsing dependency is needed —
// just require() it directly.

const errorResponse = (description) => ({
  description,
  content: {
    "application/json": {
      schema: { type: "object", properties: { error: { type: "string" } } },
    },
  },
});

const bearerAuth = [{ bearerAuth: [] }];

module.exports = {
  openapi: "3.0.3",
  info: {
    title: "HelpDesk Pro API",
    version: "1.0.0",
    description:
      "REST API for HelpDesk Pro. Every endpoint except registration/login/password-reset " +
      "and the three public lookup GETs (categories, departments, agents — needed unauthenticated " +
      "on the registration form) requires a Bearer JWT obtained from POST /auth/login.",
  },
  servers: [{ url: "http://localhost:4000/api", description: "Local development" }],
  tags: [
    { name: "Auth" },
    { name: "Tickets" },
    { name: "Knowledge Base" },
    { name: "Canned Responses" },
    { name: "Notifications" },
    { name: "Dashboard" },
    { name: "Analytics" },
    { name: "Users" },
    { name: "SLA Rules" },
    { name: "Lookups" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      PublicUser: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          email: { type: "string" },
          role: { type: "string", enum: ["user", "agent", "admin"] },
        },
      },
      NamedItem: {
        type: "object",
        properties: { id: { type: "integer" }, name: { type: "string" } },
      },
      TicketSummary: {
        type: "object",
        properties: {
          id: { type: "integer" },
          displayId: { type: "string", example: "T-42" },
          title: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
          status: { type: "string", enum: ["open", "in-progress", "resolved", "closed"] },
          category: { type: "string" },
          department: { type: "string" },
          assignedAgent: { type: "string", nullable: true },
          slaDueAt: { type: "string", format: "date-time", nullable: true },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      TicketDetail: {
        allOf: [
          { $ref: "#/components/schemas/TicketSummary" },
          {
            type: "object",
            properties: {
              description: { type: "string" },
              createdById: { type: "integer" },
              requesterName: { type: "string" },
              requesterEmail: { type: "string" },
              deviceInfo: { type: "string", nullable: true },
              createdAt: { type: "string", format: "date-time" },
              resolvedAt: { type: "string", format: "date-time", nullable: true },
              closedAt: { type: "string", format: "date-time", nullable: true },
              csatRating: { type: "integer", nullable: true, minimum: 1, maximum: 5 },
              csatComment: { type: "string", nullable: true },
              csatSubmittedAt: { type: "string", format: "date-time", nullable: true },
              comments: { type: "array", items: { $ref: "#/components/schemas/Comment" } },
              history: { type: "array", items: { $ref: "#/components/schemas/HistoryEntry" } },
              attachments: { type: "array", items: { $ref: "#/components/schemas/Attachment" } },
            },
          },
        ],
      },
      Comment: {
        type: "object",
        properties: {
          id: { type: "integer" },
          comment: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          author: { type: "string" },
          role: { type: "string" },
        },
      },
      HistoryEntry: {
        type: "object",
        properties: {
          id: { type: "integer" },
          field: { type: "string", enum: ["status", "priority", "assigned_to"] },
          oldValue: { type: "string", nullable: true },
          newValue: { type: "string", nullable: true },
          changedAt: { type: "string", format: "date-time" },
          changedBy: { type: "string" },
        },
      },
      Attachment: {
        type: "object",
        properties: {
          id: { type: "integer" },
          fileName: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          uploadedBy: { type: "string" },
        },
      },
      ArticleSummary: {
        type: "object",
        properties: {
          id: { type: "integer" },
          title: { type: "string" },
          category: { type: "string" },
          author: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          excerpt: { type: "string" },
        },
      },
      ArticleDetail: {
        type: "object",
        properties: {
          id: { type: "integer" },
          title: { type: "string" },
          content: { type: "string" },
          categoryId: { type: "integer" },
          category: { type: "string" },
          author: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CannedResponse: {
        type: "object",
        properties: {
          id: { type: "integer" },
          title: { type: "string" },
          body: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Notification: {
        type: "object",
        properties: {
          id: { type: "integer" },
          type: { type: "string", enum: ["assigned", "status_change", "comment", "sla_warning", "sla_breach"] },
          message: { type: "string" },
          isRead: { type: "integer", enum: [0, 1] },
          createdAt: { type: "string", format: "date-time" },
          ticketDisplayId: { type: "string", nullable: true },
        },
      },
      UserWithDepartment: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          email: { type: "string" },
          role: { type: "string", enum: ["user", "agent", "admin"] },
          department: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      SlaRule: {
        type: "object",
        properties: {
          priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
          responseHours: { type: "integer" },
          resolutionHours: { type: "integer" },
        },
      },
    },
  },
  paths: {
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Self-register a new account (always created with role 'user')",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password", "departmentId"],
                properties: {
                  name: { type: "string" },
                  email: { type: "string" },
                  password: { type: "string", minLength: 8 },
                  departmentId: { type: "integer" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Account created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { token: { type: "string" }, user: { $ref: "#/components/schemas/PublicUser" } },
                },
              },
            },
          },
          400: errorResponse("Missing/invalid fields"),
          409: errorResponse("An account with that email already exists"),
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Log in with email + password",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: { email: { type: "string" }, password: { type: "string" } },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Authenticated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { token: { type: "string" }, user: { $ref: "#/components/schemas/PublicUser" } },
                },
              },
            },
          },
          401: errorResponse("Invalid email or password"),
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Validate the current token and return the caller's identity",
        security: bearerAuth,
        responses: {
          200: {
            description: "Current user",
            content: { "application/json": { schema: { type: "object", properties: { user: { $ref: "#/components/schemas/PublicUser" } } } } },
          },
          401: errorResponse("Missing, invalid, or expired token"),
        },
      },
    },
    "/auth/forgot-password": {
      post: {
        tags: ["Auth"],
        summary: "Request a password reset email",
        description:
          "Always returns the same generic message regardless of whether the email exists, " +
          "to avoid leaking which addresses have accounts. Sends a real email (via Mailpit in " +
          "local/CI) containing the reset link when the account does exist.",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { email: { type: "string" } } } } },
        },
        responses: {
          200: {
            description: "Generic confirmation message (sent regardless of whether the account exists)",
            content: { "application/json": { schema: { type: "object", properties: { message: { type: "string" } } } } },
          },
        },
      },
    },
    "/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "Complete a password reset using the emailed token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token", "password"],
                properties: { token: { type: "string" }, password: { type: "string", minLength: 8 } },
              },
            },
          },
        },
        responses: {
          200: { description: "Password updated" },
          400: errorResponse("Token invalid/expired/already used, or password too short"),
        },
      },
    },

    "/tickets": {
      get: {
        tags: ["Tickets"],
        summary: "List tickets",
        description:
          "Regular users only ever see their own tickets, enforced server-side regardless of " +
          "query params. Agents/admins see everything, optionally scoped to scope=assigned.",
        security: bearerAuth,
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ["open", "in-progress", "resolved", "closed"] } },
          { name: "priority", in: "query", schema: { type: "string", enum: ["low", "medium", "high", "critical"] } },
          { name: "category", in: "query", schema: { type: "string" } },
          { name: "assignedAgent", in: "query", schema: { type: "string" }, description: "Agent name, or 'Unassigned'" },
          { name: "search", in: "query", schema: { type: "string" }, description: "Matches title or display id (T-42)" },
          { name: "scope", in: "query", schema: { type: "string", enum: ["assigned"] }, description: "Agent/admin only: limit to tickets assigned to the caller" },
        ],
        responses: {
          200: { description: "Matching tickets", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/TicketSummary" } } } } },
        },
      },
      post: {
        tags: ["Tickets"],
        summary: "Create a ticket",
        description: "Any authenticated role may create a ticket. SLA due date is computed from the sla_rules table for the chosen priority.",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "description", "categoryId", "priority", "departmentId"],
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  categoryId: { type: "integer" },
                  priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
                  departmentId: { type: "integer" },
                  assignedTo: { type: "integer", nullable: true },
                  deviceInfo: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Created", content: { "application/json": { schema: { $ref: "#/components/schemas/TicketDetail" } } } },
          400: errorResponse("Missing/invalid fields"),
        },
      },
    },
    "/tickets/bulk": {
      patch: {
        tags: ["Tickets"],
        summary: "Apply a status/priority/assignment change to multiple tickets at once",
        description: "Agent/admin only. Skips (and reports) any id in ticketIds that doesn't exist rather than failing the whole batch.",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["ticketIds"],
                properties: {
                  ticketIds: { type: "array", items: { type: "integer" }, minItems: 1 },
                  status: { type: "string", enum: ["open", "in-progress", "resolved", "closed"] },
                  priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
                  assignedTo: { type: "integer", nullable: true, description: "null unassigns" },
                },
                description: "At least one of status, priority, or assignedTo is required.",
              },
            },
          },
        },
        responses: {
          200: {
            description: "Summary of what happened",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    updated: { type: "integer", description: "Count of tickets actually updated" },
                    notFound: { type: "array", items: { type: "integer" } },
                  },
                },
              },
            },
          },
          400: errorResponse("Invalid/empty ticketIds, or no update fields given"),
          403: errorResponse("Caller is not an agent or admin"),
        },
      },
    },
    "/tickets/{id}": {
      get: {
        tags: ["Tickets"],
        summary: "Get full ticket detail (comments, history, attachments)",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Ticket detail", content: { "application/json": { schema: { $ref: "#/components/schemas/TicketDetail" } } } },
          404: errorResponse("Not found, or caller may not access this ticket"),
        },
      },
      patch: {
        tags: ["Tickets"],
        summary: "Update status, priority, and/or assignment",
        description:
          "Agents/admins may change any of status/priority/assignedTo. A regular user may " +
          "only reopen (status → in-progress) their own resolved ticket, and nothing else.",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string", enum: ["open", "in-progress", "resolved", "closed"] },
                  priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
                  assignedTo: { type: "integer", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Updated ticket detail", content: { "application/json": { schema: { $ref: "#/components/schemas/TicketDetail" } } } },
          400: errorResponse("Invalid field value"),
          403: errorResponse("A non-staff caller attempted a disallowed change"),
          404: errorResponse("Ticket not found"),
        },
      },
    },
    "/tickets/{id}/comments": {
      post: {
        tags: ["Tickets"],
        summary: "Add a comment",
        description: "Notifies whichever side of the conversation (requester/assigned agent) didn't just post.",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["comment"], properties: { comment: { type: "string" } } } } },
        },
        responses: {
          201: { description: "Created comment", content: { "application/json": { schema: { $ref: "#/components/schemas/Comment" } } } },
          400: errorResponse("comment is required"),
          404: errorResponse("Ticket not found, or caller may not access it"),
        },
      },
    },
    "/tickets/{id}/csat": {
      post: {
        tags: ["Tickets"],
        summary: "Rate a resolved/closed ticket (requester only, once)",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["rating"],
                properties: { rating: { type: "integer", minimum: 1, maximum: 5 }, comment: { type: "string", nullable: true } },
              },
            },
          },
        },
        responses: {
          200: { description: "Updated ticket detail", content: { "application/json": { schema: { $ref: "#/components/schemas/TicketDetail" } } } },
          400: errorResponse("rating out of range, or ticket not resolved/closed"),
          404: errorResponse("Not found, or caller is not the requester"),
          409: errorResponse("Already rated"),
        },
      },
    },
    "/tickets/{id}/attachments": {
      post: {
        tags: ["Tickets"],
        summary: "Upload a file attachment (multipart/form-data, field name 'file', max 5MB)",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: { "multipart/form-data": { schema: { type: "object", properties: { file: { type: "string", format: "binary" } } } } },
        },
        responses: {
          201: { description: "Uploaded", content: { "application/json": { schema: { $ref: "#/components/schemas/Attachment" } } } },
          400: errorResponse("No file uploaded, or file exceeds 5MB"),
          404: errorResponse("Ticket not found, or caller may not access it"),
        },
      },
    },
    "/tickets/{id}/attachments/{attachmentId}": {
      get: {
        tags: ["Tickets"],
        summary: "Download an attachment",
        security: bearerAuth,
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
          { name: "attachmentId", in: "path", required: true, schema: { type: "integer" } },
        ],
        responses: {
          200: { description: "File contents", content: { "application/octet-stream": {} } },
          404: errorResponse("Ticket, attachment, or access not found"),
        },
      },
    },

    "/articles": {
      get: {
        tags: ["Knowledge Base"],
        summary: "List/search articles",
        description: "Open to every authenticated role. Search matches word-by-word (short filler words dropped), not as one literal phrase.",
        security: bearerAuth,
        parameters: [
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "category", in: "query", schema: { type: "string" } },
        ],
        responses: { 200: { description: "Matching articles", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/ArticleSummary" } } } } } },
      },
      post: {
        tags: ["Knowledge Base"],
        summary: "Create an article (agent/admin only)",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "content", "categoryId"],
                properties: { title: { type: "string" }, content: { type: "string" }, categoryId: { type: "integer" } },
              },
            },
          },
        },
        responses: {
          201: { description: "Created", content: { "application/json": { schema: { type: "object", properties: { id: { type: "integer" } } } } } },
          400: errorResponse("Missing/invalid fields"),
          403: errorResponse("Caller is not an agent or admin"),
        },
      },
    },
    "/articles/{id}": {
      get: {
        tags: ["Knowledge Base"],
        summary: "Get full article content",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Article", content: { "application/json": { schema: { $ref: "#/components/schemas/ArticleDetail" } } } },
          404: errorResponse("Article not found"),
        },
      },
      patch: {
        tags: ["Knowledge Base"],
        summary: "Update an article (agent/admin only)",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { title: { type: "string" }, content: { type: "string" }, categoryId: { type: "integer" } },
              },
            },
          },
        },
        responses: {
          200: { description: "Updated" },
          400: errorResponse("Nothing to update, or invalid categoryId"),
          403: errorResponse("Caller is not an agent or admin"),
          404: errorResponse("Article not found"),
        },
      },
      delete: {
        tags: ["Knowledge Base"],
        summary: "Delete an article (agent/admin only)",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          204: { description: "Deleted" },
          403: errorResponse("Caller is not an agent or admin"),
          404: errorResponse("Article not found"),
        },
      },
    },

    "/canned-responses": {
      get: {
        tags: ["Canned Responses"],
        summary: "List canned responses (agent/admin only)",
        security: bearerAuth,
        responses: {
          200: { description: "All canned responses", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/CannedResponse" } } } } },
          403: errorResponse("Caller is not an agent or admin"),
        },
      },
      post: {
        tags: ["Canned Responses"],
        summary: "Create a canned response (agent/admin only)",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["title", "body"], properties: { title: { type: "string" }, body: { type: "string" } } } } },
        },
        responses: {
          201: { description: "Created", content: { "application/json": { schema: { $ref: "#/components/schemas/CannedResponse" } } } },
          400: errorResponse("title and body are required"),
          403: errorResponse("Caller is not an agent or admin"),
        },
      },
    },
    "/canned-responses/{id}": {
      patch: {
        tags: ["Canned Responses"],
        summary: "Update a canned response (agent/admin only)",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: { "application/json": { schema: { type: "object", properties: { title: { type: "string" }, body: { type: "string" } } } } },
        },
        responses: {
          200: { description: "Updated" },
          400: errorResponse("Nothing to update"),
          403: errorResponse("Caller is not an agent or admin"),
          404: errorResponse("Canned response not found"),
        },
      },
      delete: {
        tags: ["Canned Responses"],
        summary: "Delete a canned response (agent/admin only)",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          204: { description: "Deleted" },
          403: errorResponse("Caller is not an agent or admin"),
          404: errorResponse("Canned response not found"),
        },
      },
    },

    "/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "List the caller's 20 most recent notifications, plus an unread count",
        security: bearerAuth,
        responses: {
          200: {
            description: "Notifications + unread count",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    notifications: { type: "array", items: { $ref: "#/components/schemas/Notification" } },
                    unreadCount: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/notifications/{id}/read": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark one notification read",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 204: { description: "Marked read" }, 404: errorResponse("Not found, or not owned by the caller") },
      },
    },
    "/notifications/read-all": {
      post: {
        tags: ["Notifications"],
        summary: "Mark every one of the caller's notifications read",
        security: bearerAuth,
        responses: { 204: { description: "Marked read" } },
      },
    },

    "/dashboard/stats": {
      get: {
        tags: ["Dashboard"],
        summary: "Role-scoped ticket counts + 5 most recent tickets",
        description: "Users see only their own tickets; agents see only tickets assigned to them; admins see everything.",
        security: bearerAuth,
        responses: {
          200: {
            description: "Stats + recent tickets",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    stats: {
                      type: "object",
                      properties: {
                        total: { type: "integer" },
                        open: { type: "integer" },
                        inProgress: { type: "integer" },
                        resolved: { type: "integer" },
                        highCritical: { type: "integer" },
                        slaBreaches: { type: "integer" },
                      },
                    },
                    recentTickets: { type: "array", items: { $ref: "#/components/schemas/TicketSummary" } },
                  },
                },
              },
            },
          },
        },
      },
    },

    "/analytics/summary": {
      get: {
        tags: ["Analytics"],
        summary: "Org-wide ticket analytics (agent/admin only)",
        security: bearerAuth,
        responses: {
          200: {
            description: "Charts and KPIs for the analytics page",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    byCategory: { type: "array", items: { type: "object", properties: { category: { type: "string" }, count: { type: "integer" } } } },
                    byPriority: { type: "array", items: { type: "object", properties: { priority: { type: "string" }, count: { type: "integer" } } } },
                    byMonth: { type: "array", items: { type: "object", properties: { month: { type: "string" }, count: { type: "integer" } } } },
                    avgResolutionHours: { type: "number", nullable: true },
                    slaCompliance: {
                      type: "object",
                      properties: {
                        total: { type: "integer" }, met: { type: "integer" }, breached: { type: "integer" }, percentage: { type: "number", nullable: true },
                      },
                    },
                    agentPerformance: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          agent: { type: "string" }, assigned: { type: "integer" }, resolved: { type: "integer" },
                          avgResolutionHours: { type: "number", nullable: true }, slaCompliancePercentage: { type: "number", nullable: true },
                          avgCsat: { type: "number", nullable: true },
                        },
                      },
                    },
                    csat: { type: "object", properties: { total: { type: "integer" }, average: { type: "number", nullable: true } } },
                  },
                },
              },
            },
          },
          403: errorResponse("Caller is not an agent or admin"),
        },
      },
    },

    "/users": {
      get: {
        tags: ["Users"],
        summary: "List every account (admin only)",
        security: bearerAuth,
        responses: {
          200: { description: "All users", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/UserWithDepartment" } } } } },
          403: errorResponse("Caller is not an admin"),
        },
      },
    },
    "/users/{id}": {
      patch: {
        tags: ["Users"],
        summary: "Change a user's role (admin only, cannot change your own role)",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["role"], properties: { role: { type: "string", enum: ["user", "agent", "admin"] } } } } },
        },
        responses: {
          200: { description: "Updated user", content: { "application/json": { schema: { $ref: "#/components/schemas/UserWithDepartment" } } } },
          400: errorResponse("Invalid role, or attempting to change your own role"),
          403: errorResponse("Caller is not an admin"),
          404: errorResponse("User not found"),
        },
      },
    },

    "/sla-rules": {
      get: {
        tags: ["SLA Rules"],
        summary: "List SLA rules per priority (agent/admin can view)",
        security: bearerAuth,
        responses: { 200: { description: "Rules", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/SlaRule" } } } } } },
      },
    },
    "/sla-rules/{priority}": {
      patch: {
        tags: ["SLA Rules"],
        summary: "Update a priority's response/resolution targets (admin only)",
        security: bearerAuth,
        parameters: [{ name: "priority", in: "path", required: true, schema: { type: "string", enum: ["low", "medium", "high", "critical"] } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["responseHours", "resolutionHours"], properties: { responseHours: { type: "integer" }, resolutionHours: { type: "integer" } } },
            },
          },
        },
        responses: {
          200: { description: "Updated rule", content: { "application/json": { schema: { $ref: "#/components/schemas/SlaRule" } } } },
          400: errorResponse("Non-positive hours, or response longer than resolution"),
          403: errorResponse("Caller is not an admin"),
          404: errorResponse("Unknown priority"),
        },
      },
    },

    "/categories": {
      get: {
        tags: ["Lookups"],
        summary: "List categories (public — no auth required, needed on the registration form)",
        responses: { 200: { description: "Categories", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/NamedItem" } } } } } },
      },
      post: {
        tags: ["Lookups"],
        summary: "Create a category (admin only)",
        security: bearerAuth,
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name"], properties: { name: { type: "string" } } } } } },
        responses: { 201: { description: "Created", content: { "application/json": { schema: { $ref: "#/components/schemas/NamedItem" } } } }, 409: errorResponse("Name already in use") },
      },
    },
    "/categories/{id}": {
      patch: {
        tags: ["Lookups"],
        summary: "Rename a category (admin only)",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name"], properties: { name: { type: "string" } } } } } },
        responses: { 200: { description: "Renamed" }, 404: errorResponse("Not found"), 409: errorResponse("Name already in use") },
      },
      delete: {
        tags: ["Lookups"],
        summary: "Delete a category (admin only)",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 204: { description: "Deleted" }, 404: errorResponse("Not found"), 409: errorResponse("Still referenced by tickets") },
      },
    },
    "/departments": {
      get: {
        tags: ["Lookups"],
        summary: "List departments (public — no auth required, needed on the registration form)",
        responses: { 200: { description: "Departments", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/NamedItem" } } } } } },
      },
      post: {
        tags: ["Lookups"],
        summary: "Create a department (admin only)",
        security: bearerAuth,
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name"], properties: { name: { type: "string" } } } } } },
        responses: { 201: { description: "Created", content: { "application/json": { schema: { $ref: "#/components/schemas/NamedItem" } } } }, 409: errorResponse("Name already in use") },
      },
    },
    "/departments/{id}": {
      patch: {
        tags: ["Lookups"],
        summary: "Rename a department (admin only)",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name"], properties: { name: { type: "string" } } } } } },
        responses: { 200: { description: "Renamed" }, 404: errorResponse("Not found"), 409: errorResponse("Name already in use") },
      },
      delete: {
        tags: ["Lookups"],
        summary: "Delete a department (admin only)",
        security: bearerAuth,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 204: { description: "Deleted" }, 404: errorResponse("Not found"), 409: errorResponse("Still referenced by tickets") },
      },
    },
    "/agents": {
      get: {
        tags: ["Lookups"],
        summary: "List all agent accounts (public — no auth required)",
        responses: {
          200: {
            description: "Agents",
            content: {
              "application/json": {
                schema: { type: "array", items: { type: "object", properties: { id: { type: "integer" }, name: { type: "string" }, email: { type: "string" } } } },
              },
            },
          },
        },
      },
    },
  },
};
