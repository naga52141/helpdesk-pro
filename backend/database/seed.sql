USE helpdeskpro;

INSERT INTO departments (name) VALUES
  ('IT'), ('HR'), ('Finance'), ('Operations'), ('Other');

INSERT INTO categories (name) VALUES
  ('Hardware'), ('Software'), ('Network'), ('Account Access'), ('Other');

INSERT INTO sla_rules (priority, response_hours, resolution_hours) VALUES
  ('critical', 1, 4),
  ('high', 2, 8),
  ('medium', 4, 24),
  ('low', 8, 72);

-- password_hash values below are placeholders — real hashing (bcrypt) gets wired up in the auth step.
INSERT INTO users (name, email, password_hash, role, department_id) VALUES
  ('Admin User', 'admin@helpdeskpro.local', 'placeholder-hash', 'admin', 1),
  ('Alex Kim', 'alex.kim@helpdeskpro.local', 'placeholder-hash', 'agent', 1),
  ('Priya Nair', 'priya.nair@helpdeskpro.local', 'placeholder-hash', 'agent', 3),
  ('Jordan Lee', 'jordan.lee@helpdeskpro.local', 'placeholder-hash', 'agent', 2),
  ('Sam Torres', 'sam.torres@company.com', 'placeholder-hash', 'user', 1),
  ('Demo User', 'demo.user@company.com', 'placeholder-hash', 'user', 4),
  -- Not a real login — used only to attribute automated changes (e.g. SLA auto-escalation) in the Activity log.
  ('System', 'system@helpdeskpro.local', 'placeholder-hash', 'admin', 1);

-- created_at is set explicitly (rather than left to default NOW()) so it precedes
-- each ticket's resolved_at/sla_due_at — otherwise resolution-time math goes negative.
INSERT INTO tickets (title, description, category_id, priority, status, department_id, created_by, assigned_to, device_info, created_at, sla_due_at, resolved_at) VALUES
  ('VPN not connecting', 'Unable to connect to the corporate VPN since this morning. Getting "Authentication failed" even though credentials are correct.', 3, 'high', 'open', 1, 5, 2, 'MacBook Pro 14", macOS 15', '2026-08-10 09:00:00', '2026-08-11 10:00:00', NULL),
  ('Payroll portal error', 'Payroll portal throws a 500 error when submitting timesheet approvals.', 2, 'critical', 'in-progress', 3, 6, 3, 'Windows 11 desktop', '2026-08-12 09:00:00', '2026-08-12 13:00:00', NULL),
  ('New laptop request', 'Requesting a replacement laptop, current one will not hold a charge past 30 minutes.', 1, 'low', 'resolved', 1, 5, 2, 'N/A', '2026-08-08 10:00:00', '2026-08-12 09:00:00', '2026-08-11 16:00:00'),
  ('Access to shared drive', 'Need read/write access to the ops-shared drive for the quarterly reports project.', 4, 'medium', 'open', 4, 6, NULL, 'N/A', '2026-08-09 09:00:00', '2026-08-11 09:00:00', NULL),
  ('Password reset', 'Locked out of the HR system after too many failed login attempts.', 4, 'low', 'resolved', 2, 5, 4, 'N/A', '2026-08-09 08:00:00', '2026-08-14 10:00:00', '2026-08-10 09:15:00');

INSERT INTO comments (ticket_id, user_id, comment) VALUES
  (1, 2, 'Looking into this now, can you confirm which VPN client version you are on?'),
  (1, 5, 'Client version 4.12.1'),
  (2, 3, 'Escalated to the vendor, waiting on a hotfix ETA.'),
  (3, 2, 'New MacBook Air issued and configured. Marking resolved.'),
  (5, 4, 'Password reset and MFA re-enrolled.');
