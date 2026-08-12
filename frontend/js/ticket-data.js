// Shared mock ticket data — used by the queue and detail pages.
// Will be replaced by real API calls once the backend exists.
const TICKETS = [
  {
    id: "T-1042", title: "VPN not connecting", category: "network", priority: "high", status: "open",
    agent: "Alex Kim", department: "IT", updated: "2026-08-12", createdAt: "2026-08-10", slaDueAt: "2026-08-11", slaStatus: "breached", mine: false,
    requester: "Sam Torres <sam.torres@company.com>", deviceInfo: "MacBook Pro 14\", macOS 15", attachment: "vpn-error-screenshot.png",
    description: "Unable to connect to the corporate VPN since this morning. Getting \"Authentication failed\" even though my credentials are correct. Tried restarting the client twice.",
    comments: [
      { author: "Alex Kim", role: "agent", text: "Looking into this now, can you confirm which VPN client version you're on?", time: "2026-08-10 14:20" },
      { author: "Sam Torres", role: "user", text: "Client version 4.12.1", time: "2026-08-10 14:45" },
    ],
  },
  {
    id: "T-1041", title: "Payroll portal error", category: "software", priority: "critical", status: "in-progress",
    agent: "Priya Nair", department: "Finance", updated: "2026-08-12", createdAt: "2026-08-12", slaDueAt: "2026-08-12", slaStatus: "due-today", mine: false,
    requester: "Morgan Diaz <morgan.diaz@company.com>", deviceInfo: "Windows 11 desktop", attachment: null,
    description: "Payroll portal throws a 500 error when submitting timesheet approvals. Affecting the whole Finance team.",
    comments: [
      { author: "Priya Nair", role: "agent", text: "Escalated to the vendor, waiting on a hotfix ETA.", time: "2026-08-12 09:10" },
    ],
  },
  {
    id: "T-1039", title: "New laptop request", category: "hardware", priority: "low", status: "resolved",
    agent: "Alex Kim", department: "IT", updated: "2026-08-11", createdAt: "2026-08-08", slaDueAt: "2026-08-12", slaStatus: "met", mine: false,
    requester: "Jamie Wu <jamie.wu@company.com>", deviceInfo: "N/A", attachment: null,
    description: "Requesting a replacement laptop — current one won't hold a charge past 30 minutes.",
    comments: [
      { author: "Alex Kim", role: "agent", text: "New MacBook Air issued and configured. Marking resolved.", time: "2026-08-11 16:00" },
    ],
  },
  {
    id: "T-1038", title: "Access to shared drive", category: "account-access", priority: "medium", status: "open",
    agent: "Unassigned", department: "Operations", updated: "2026-08-11", createdAt: "2026-08-09", slaDueAt: "2026-08-11", slaStatus: "breached", mine: false,
    requester: "Devon Park <devon.park@company.com>", deviceInfo: "N/A", attachment: null,
    description: "Need read/write access to the shared 'ops-shared' drive for the new quarterly reports project.",
    comments: [],
  },
  {
    id: "T-1037", title: "Slow wifi in conference room", category: "network", priority: "medium", status: "in-progress",
    agent: "Jordan Lee", department: "IT", updated: "2026-08-11", createdAt: "2026-08-10", slaDueAt: "2026-08-12", slaStatus: "due-today", mine: false,
    requester: "Facilities Team <facilities@company.com>", deviceInfo: "N/A — affects conference room B access point", attachment: null,
    description: "Wifi in conference room B drops below 1Mbps during large meetings. Suspect the AP needs a firmware update or replacement.",
    comments: [
      { author: "Jordan Lee", role: "agent", text: "Confirmed the AP firmware is 3 versions behind. Scheduling an update after hours.", time: "2026-08-11 11:30" },
    ],
  },
  {
    id: "T-1036", title: "Software license renewal", category: "software", priority: "low", status: "closed",
    agent: "Priya Nair", department: "Finance", updated: "2026-08-10", createdAt: "2026-08-05", slaDueAt: "2026-08-09", slaStatus: "late", mine: false,
    requester: "Finance Ops <finance-ops@company.com>", deviceInfo: "N/A", attachment: "license-invoice.pdf",
    description: "Adobe Creative Cloud license expired for the design team, need renewal processed.",
    comments: [
      { author: "Priya Nair", role: "agent", text: "Renewed for 12 months, invoice attached.", time: "2026-08-10 10:00" },
    ],
  },
  {
    id: "T-1035", title: "Email sync issue", category: "software", priority: "medium", status: "closed",
    agent: "Alex Kim", department: "IT", updated: "2026-08-10", createdAt: "2026-08-09", slaDueAt: "2026-08-11", slaStatus: "met", mine: true,
    requester: "You <you@company.com>", deviceInfo: "iPhone 15, iOS 18", attachment: null,
    description: "Outlook mobile app stopped syncing new emails since yesterday afternoon.",
    comments: [
      { author: "Alex Kim", role: "agent", text: "Please try removing and re-adding the account on the Outlook app.", time: "2026-08-09 15:00" },
      { author: "You", role: "user", text: "That fixed it, thank you!", time: "2026-08-10 08:30" },
    ],
  },
  {
    id: "T-1034", title: "Password reset", category: "account-access", priority: "low", status: "resolved",
    agent: "Jordan Lee", department: "HR", updated: "2026-08-10", createdAt: "2026-08-10", slaDueAt: "2026-08-14", slaStatus: "met", mine: false,
    requester: "Taylor Brooks <taylor.brooks@company.com>", deviceInfo: "N/A", attachment: null,
    description: "Locked out of the HR system after too many failed login attempts.",
    comments: [
      { author: "Jordan Lee", role: "agent", text: "Password reset and MFA re-enrolled.", time: "2026-08-10 09:15" },
    ],
  },
  {
    id: "T-1033", title: "Monitor not turning on", category: "hardware", priority: "medium", status: "open",
    agent: "Unassigned", department: "IT", updated: "2026-08-09", createdAt: "2026-08-09", slaDueAt: "2026-08-11", slaStatus: "breached", mine: false,
    requester: "Riley Chen <riley.chen@company.com>", deviceInfo: "Dell UltraSharp U2723QE", attachment: null,
    description: "External monitor won't power on, tried a different outlet and cable already.",
    comments: [],
  },
  {
    id: "T-1032", title: "Timesheet app crashing", category: "software", priority: "high", status: "in-progress",
    agent: "Priya Nair", department: "Finance", updated: "2026-08-09", createdAt: "2026-08-09", slaDueAt: "2026-08-10", slaStatus: "breached", mine: false,
    requester: "Casey Nguyen <casey.nguyen@company.com>", deviceInfo: "iPad Air, iPadOS 18", attachment: null,
    description: "Timesheet app crashes immediately after opening on iPad. Works fine on desktop browser.",
    comments: [
      { author: "Priya Nair", role: "agent", text: "Reproduced on our end, filed a bug with the vendor.", time: "2026-08-09 13:00" },
    ],
  },
  {
    id: "T-1031", title: "Printer offline - 3rd floor", category: "hardware", priority: "medium", status: "open",
    agent: "Alex Kim", department: "Operations", updated: "2026-08-10", createdAt: "2026-08-10", slaDueAt: "2026-08-12", slaStatus: "due-today", mine: false,
    requester: "Operations Team <ops@company.com>", deviceInfo: "HP LaserJet M479 (3rd floor)", attachment: null,
    description: "3rd floor printer shows offline in the OS but the network light is on. Others on the floor can't print either.",
    comments: [],
  },
  {
    id: "T-1028", title: "Blocked website access request", category: "network", priority: "low", status: "open",
    agent: "Unassigned", department: "IT", updated: "2026-08-08", createdAt: "2026-08-08", slaDueAt: "2026-08-12", slaStatus: "due-today", mine: false,
    requester: "Jordan Reyes <jordan.reyes@company.com>", deviceInfo: "N/A", attachment: null,
    description: "Requesting access to a vendor's documentation site that's currently blocked by the content filter.",
    comments: [],
  },
  {
    id: "T-1025", title: "Onboarding account setup", category: "account-access", priority: "high", status: "resolved",
    agent: "Jordan Lee", department: "HR", updated: "2026-08-07", createdAt: "2026-08-06", slaDueAt: "2026-08-07", slaStatus: "met", mine: false,
    requester: "HR Team <hr@company.com>", deviceInfo: "N/A", attachment: null,
    description: "New hire starting Monday needs email, Slack, and HRIS accounts provisioned.",
    comments: [
      { author: "Jordan Lee", role: "agent", text: "All accounts provisioned and welcome email sent.", time: "2026-08-07 17:00" },
    ],
  },
  {
    id: "T-1020", title: "Monitor flickering", category: "hardware", priority: "low", status: "resolved",
    agent: "Alex Kim", department: "IT", updated: "2026-08-05", createdAt: "2026-08-01", slaDueAt: "2026-08-05", slaStatus: "met", mine: true,
    requester: "You <you@company.com>", deviceInfo: "LG 27UL850, HDMI", attachment: null,
    description: "Monitor flickers intermittently, especially right after waking from sleep.",
    comments: [
      { author: "Alex Kim", role: "agent", text: "Swapped the HDMI cable for a DisplayPort one — that resolved it.", time: "2026-08-05 12:00" },
    ],
  },
];
