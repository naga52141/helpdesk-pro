const PRIORITY_COLORS = {
  low: "var(--viz-good)",
  medium: "var(--viz-warning)",
  high: "var(--viz-serious)",
  critical: "var(--viz-critical)",
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatHours(hours) {
  if (hours === null || hours === undefined) return "—";
  const rounded = Math.round(hours);
  if (rounded < 24) return `${rounded}h`;
  const days = Math.floor(rounded / 24);
  const rem = rounded % 24;
  return rem === 0 ? `${days}d` : `${days}d ${rem}h`;
}

function formatMonthLabel(monthStr) {
  const [year, month] = monthStr.split("-");
  return `${MONTH_NAMES[Number(month) - 1]} '${year.slice(2)}`;
}

function formatPercentage(pct) {
  return pct === null || pct === undefined ? "—" : `${pct}%`;
}

const session = requireSession();
const isAgentOrAdmin = session.user.role === "agent" || session.user.role === "admin";

const contentEl = document.getElementById("analytics-content");
const deniedEl = document.getElementById("access-denied");
const errorEl = document.getElementById("analytics-error");

if (!isAgentOrAdmin) {
  deniedEl.hidden = false;
  contentEl.hidden = true;
} else {
  contentEl.hidden = false;
  loadAnalytics();
}

async function loadAnalytics() {
  try {
    const data = await apiFetch("/analytics/summary");
    renderKpis(data);
    renderCategoryChart(data.byCategory);
    renderPriorityChart(data.byPriority);
    renderMonthChart(data.byMonth);
    renderAgentTable(data.agentPerformance);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  }
}

function renderKpis(data) {
  document.getElementById("kpi-resolution-time").textContent = formatHours(data.avgResolutionHours);

  const sla = data.slaCompliance;
  const slaPct = sla.percentage;
  document.getElementById("kpi-sla-percentage").textContent = formatPercentage(slaPct);
  document.getElementById("kpi-sla-sub").textContent =
    sla.total === 0 ? "No resolved tickets yet" : `${sla.met} met · ${sla.breached} breached (of ${sla.total} resolved)`;

  const fill = document.getElementById("sla-meter-fill");
  const pct = slaPct === null ? 0 : slaPct;
  fill.style.width = `${pct}%`;
  fill.style.background = pct >= 90 ? "var(--viz-good)" : pct >= 70 ? "var(--viz-warning)" : "var(--viz-critical)";

  const totalTickets = data.byPriority.reduce((sum, p) => sum + p.count, 0);
  document.getElementById("kpi-total-tickets").textContent = totalTickets;
}

function renderCategoryChart(byCategory) {
  const vizEl = document.getElementById("category-viz");
  const tableEl = document.getElementById("category-table");

  renderHorizontalBarChart(vizEl, byCategory.map((d) => ({ label: d.category, value: d.count })), {
    colorFn: () => "var(--viz-series-1)",
  });
  renderDataTable(tableEl, ["Category", "Tickets"], byCategory.map((d) => [d.category, d.count]));
  initTableToggle(document.getElementById("category-toggle"), vizEl, tableEl);
}

function renderPriorityChart(byPriority) {
  const vizEl = document.getElementById("priority-viz");
  const tableEl = document.getElementById("priority-table");

  const chartData = byPriority.map((d) => ({ label: capitalize(d.priority), value: d.count, priority: d.priority }));
  renderColumnChart(vizEl, chartData, {
    colorFn: (d) => PRIORITY_COLORS[d.priority],
  });
  renderDataTable(tableEl, ["Priority", "Tickets"], byPriority.map((d) => [capitalize(d.priority), d.count]));
  initTableToggle(document.getElementById("priority-toggle"), vizEl, tableEl);

  const legend = document.getElementById("priority-legend");
  legend.innerHTML = "";
  byPriority.forEach((d) => {
    const item = document.createElement("div");
    item.className = "legend-item";
    const swatch = document.createElement("span");
    swatch.className = "legend-swatch";
    swatch.style.background = PRIORITY_COLORS[d.priority];
    const label = document.createElement("span");
    label.textContent = capitalize(d.priority);
    item.appendChild(swatch);
    item.appendChild(label);
    legend.appendChild(item);
  });
}

function renderMonthChart(byMonth) {
  const vizEl = document.getElementById("month-viz");
  const tableEl = document.getElementById("month-table");

  renderLineChart(vizEl, byMonth.map((d) => ({ label: formatMonthLabel(d.month), value: d.count })));
  renderDataTable(tableEl, ["Month", "Tickets"], byMonth.map((d) => [formatMonthLabel(d.month), d.count]));
  initTableToggle(document.getElementById("month-toggle"), vizEl, tableEl);
}

function renderAgentTable(agentPerformance) {
  const body = document.getElementById("agent-table-body");
  body.innerHTML = "";

  if (agentPerformance.length === 0) {
    body.innerHTML = `<tr><td colspan="5" class="empty-chart-state">No agents yet.</td></tr>`;
    return;
  }

  agentPerformance.forEach((a) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="agent-name-cell">${a.agent}</td>
      <td>${a.assigned}</td>
      <td>${a.resolved}</td>
      <td>${formatHours(a.avgResolutionHours)}</td>
      <td>${formatPercentage(a.slaCompliancePercentage)}</td>
    `;
    body.appendChild(row);
  });
}
