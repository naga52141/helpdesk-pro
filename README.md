# HelpDesk Pro

A ServiceNow/Jira-Service-Management–style IT ticketing system: ticket queues with SLA
tracking, a knowledge base, real-time updates, an admin panel, and role-based access for
end users, agents, and admins.

[![CI](https://github.com/naga52141/helpdesk-pro/actions/workflows/ci.yml/badge.svg)](https://github.com/naga52141/helpdesk-pro/actions/workflows/ci.yml)

**[Live demo](https://helpdeskpro-frontend.onrender.com)** &nbsp;·&nbsp; **[Test reports](https://naga52141.github.io/helpdesk-pro/)**

## Live demo

**https://helpdeskpro-frontend.onrender.com**

| Role  | Email                          | Password       |
| ----- | ------------------------------ | -------------- |
| Admin | `admin@helpdeskpro.local`      | `Password123!` |
| Agent | `alex.kim@helpdeskpro.local`   | `Password123!` |
| User  | `sam.torres@company.com`       | `Password123!` |

> The backend runs on a free instance that spins down after 15 minutes of inactivity —
> the first request after a quiet period can take up to ~50 seconds to respond while it
> wakes back up. Uploaded attachments and email delivery aren't wired up in this
> deployment; everything else works.

## Test reports

Every push to `main` runs the full Jest + Selenium/PyTest suite and publishes an Allure
report with pass/fail trends over time:

**https://naga52141.github.io/helpdesk-pro/**

## Features

- Ticket queue with search, filters, bulk actions, saved views, and CSV export
- Ticket detail: comments, attachments, activity log, canned responses, duplicate marking
- SLA rules per priority with automatic escalation and breach notifications
- Real-time updates over Socket.IO (live ticket changes, notifications)
- Email notifications and password reset (via SMTP)
- Knowledge base with searchable articles
- Analytics dashboard (tickets by category/priority/month, SLA compliance, agent performance)
- Admin panel: user roles, categories, departments, SLA rules, canned responses, audit log
- Two-factor authentication (TOTP) with QR-code enrollment
- Keyboard shortcuts, CSAT ratings, light/dark theme

## Tech stack

- **Frontend** — vanilla HTML/CSS/JS, no framework or build step
- **Backend** — Node.js, Express, raw SQL via `mysql2` (no ORM)
- **Database** — MySQL
- **Real-time** — Socket.IO
- **Auth** — JWT, bcrypt, TOTP (`otplib`)
- **Testing** — Jest (backend unit tests), Selenium + PyTest (end-to-end, Page Object Model)
- **CI/CD** — GitHub Actions, Allure reports published to GitHub Pages
- **Docs** — Swagger/OpenAPI at `/api-docs`

## Running it locally

### With Docker (recommended)

```
docker compose up --build
```

- Frontend: http://localhost:8935
- Backend API: http://localhost:4000
- Mailpit (catches outgoing email in dev): http://localhost:8025

The database is seeded automatically on first run. Demo accounts use the same
credentials as the live demo above.

### Without Docker

```
# Backend
cd backend
npm install
cp .env.example .env   # fill in your local MySQL credentials
mysql -uroot < database/schema.sql
mysql -uroot < database/seed.sql
node scripts/set-demo-passwords.js
npm start

# Frontend (separate terminal)
cd frontend
python3 -m http.server 8935
```

## Running the tests

```
# Backend unit tests
cd backend && npm test

# End-to-end suite (backend + frontend must be running, see above)
cd tests
pip install -r requirements.txt
pytest
```

## Deploying your own copy

The repo includes a `render.yaml` Blueprint for deploying the backend and frontend to
[Render](https://render.com), paired with a free external MySQL host (Render doesn't
offer managed MySQL). See the deployment notes in `render.yaml` and `backend/.env.example`
for the environment variables each service needs.
