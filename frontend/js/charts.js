const SVG_NS = "http://www.w3.org/2000/svg";

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

// Rounded rect where only the listed corners ('tl','tr','br','bl') get radius r.
function roundedRectPath(x, y, w, h, r, corners) {
  const tl = corners.includes("tl") ? r : 0;
  const tr = corners.includes("tr") ? r : 0;
  const br = corners.includes("br") ? r : 0;
  const bl = corners.includes("bl") ? r : 0;
  return [
    `M ${x + tl} ${y}`,
    `H ${x + w - tr}`,
    tr ? `A ${tr} ${tr} 0 0 1 ${x + w} ${y + tr}` : `L ${x + w} ${y}`,
    `V ${y + h - br}`,
    br ? `A ${br} ${br} 0 0 1 ${x + w - br} ${y + h}` : `L ${x + w} ${y + h}`,
    `H ${x + bl}`,
    bl ? `A ${bl} ${bl} 0 0 1 ${x} ${y + h - bl}` : `L ${x} ${y + h}`,
    `V ${y + tl}`,
    tl ? `A ${tl} ${tl} 0 0 1 ${x + tl} ${y}` : `L ${x} ${y}`,
    "Z",
  ].join(" ");
}

let sharedTooltip = null;
function getTooltip() {
  if (!sharedTooltip) {
    sharedTooltip = document.createElement("div");
    sharedTooltip.className = "viz-tooltip";
    sharedTooltip.hidden = true;
    document.body.appendChild(sharedTooltip);
  }
  return sharedTooltip;
}

function showTooltip(x, y, valueText, labelText) {
  const tt = getTooltip();
  tt.innerHTML = "";
  const value = document.createElement("div");
  value.className = "tt-value";
  value.textContent = valueText;
  const label = document.createElement("div");
  label.className = "tt-label";
  label.textContent = labelText;
  tt.appendChild(value);
  tt.appendChild(label);
  tt.style.left = `${x}px`;
  tt.style.top = `${y - 10}px`;
  tt.hidden = false;
}

function hideTooltip() {
  if (sharedTooltip) sharedTooltip.hidden = true;
}

function renderEmptyState(container, message) {
  container.innerHTML = `<p class="empty-chart-state">${message}</p>`;
}

function renderDataTable(container, columns, rows) {
  const table = document.createElement("table");
  table.className = "chart-data-table";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  columns.forEach((c) => {
    const th = document.createElement("th");
    th.textContent = c;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    row.forEach((cell) => {
      const td = document.createElement("td");
      td.textContent = cell;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  container.innerHTML = "";
  container.appendChild(table);
}

// Horizontal bar chart — one value per category, single or per-bar color.
function renderHorizontalBarChart(container, data, opts = {}) {
  if (data.length === 0) return renderEmptyState(container, "No data yet.");

  const colorFn = opts.colorFn || (() => "var(--viz-series-1)");
  const formatValue = opts.formatValue || ((v) => String(v));
  const labelWidth = 110;
  const rowHeight = 34;
  const barThickness = 20;
  const padding = { top: 8, right: 44, bottom: 8, left: labelWidth };
  const width = 520;
  const height = data.length * rowHeight + padding.top + padding.bottom;
  const plotWidth = width - padding.left - padding.right;
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width: "100%", height, role: "img" });

  data.forEach((d, i) => {
    const y = padding.top + i * rowHeight;
    const barW = Math.max((d.value / maxValue) * plotWidth, d.value > 0 ? 3 : 0);

    const label = svgEl("text", {
      x: padding.left - 10,
      y: y + barThickness / 2 + 4,
      "text-anchor": "end",
      class: "viz-bar-label",
    });
    label.textContent = d.label;
    svg.appendChild(label);

    const bar = svgEl("path", {
      d: roundedRectPath(padding.left, y, barW, barThickness, 4, ["tr", "br"]),
      fill: colorFn(d, i),
      class: "viz-bar",
    });
    svg.appendChild(bar);

    const hitArea = svgEl("rect", {
      x: padding.left,
      y: y - 2,
      width: plotWidth,
      height: barThickness + 4,
      fill: "transparent",
    });
    hitArea.addEventListener("pointerenter", (e) => {
      bar.classList.add("hovered");
      const rect = hitArea.getBoundingClientRect();
      showTooltip(rect.left + window.scrollX + 20, rect.top + window.scrollY, formatValue(d.value), d.label);
    });
    hitArea.addEventListener("pointerleave", () => {
      bar.classList.remove("hovered");
      hideTooltip();
    });
    svg.appendChild(hitArea);

    const valueLabel = svgEl("text", {
      x: padding.left + barW + 8,
      y: y + barThickness / 2 + 4,
      class: "viz-value-label",
    });
    valueLabel.textContent = formatValue(d.value);
    svg.appendChild(valueLabel);
  });

  const wrap = document.createElement("div");
  wrap.className = "viz-svg-wrap";
  wrap.appendChild(svg);
  container.innerHTML = "";
  container.appendChild(wrap);
}

// Vertical column chart — fixed category order (e.g. priority), per-bar color.
function renderColumnChart(container, data, opts = {}) {
  if (data.length === 0) return renderEmptyState(container, "No data yet.");

  const colorFn = opts.colorFn || (() => "var(--viz-series-1)");
  const formatValue = opts.formatValue || ((v) => String(v));
  const width = 480;
  const height = 220;
  const padding = { top: 20, right: 16, bottom: 34, left: 16 };
  const plotHeight = height - padding.top - padding.bottom;
  const plotWidth = width - padding.left - padding.right;
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const colWidth = plotWidth / data.length;
  const barWidth = Math.min(colWidth * 0.5, 24);

  const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width: "100%", height, role: "img" });

  const baseline = svgEl("line", {
    x1: padding.left, y1: height - padding.bottom, x2: width - padding.right, y2: height - padding.bottom,
    class: "viz-baseline",
  });
  svg.appendChild(baseline);

  data.forEach((d, i) => {
    const colCenter = padding.left + colWidth * i + colWidth / 2;
    const barH = Math.max((d.value / maxValue) * plotHeight, d.value > 0 ? 3 : 0);
    const y = height - padding.bottom - barH;
    const x = colCenter - barWidth / 2;

    const bar = svgEl("path", {
      d: roundedRectPath(x, y, barWidth, barH, 4, ["tl", "tr"]),
      fill: colorFn(d, i),
      class: "viz-bar",
    });
    svg.appendChild(bar);

    const hitArea = svgEl("rect", { x: colCenter - colWidth / 2, y: padding.top, width: colWidth, height: plotHeight, fill: "transparent" });
    hitArea.addEventListener("pointerenter", () => {
      bar.classList.add("hovered");
      const rect = hitArea.getBoundingClientRect();
      showTooltip(rect.left + window.scrollX + colWidth / 2, rect.top + window.scrollY, formatValue(d.value), d.label);
    });
    hitArea.addEventListener("pointerleave", () => {
      bar.classList.remove("hovered");
      hideTooltip();
    });
    svg.appendChild(hitArea);

    if (d.value > 0) {
      const valueLabel = svgEl("text", { x: colCenter, y: y - 6, "text-anchor": "middle", class: "viz-value-label" });
      valueLabel.textContent = formatValue(d.value);
      svg.appendChild(valueLabel);
    }

    const label = svgEl("text", { x: colCenter, y: height - padding.bottom + 18, "text-anchor": "middle", class: "viz-bar-label" });
    label.textContent = d.label;
    svg.appendChild(label);
  });

  const wrap = document.createElement("div");
  wrap.className = "viz-svg-wrap";
  wrap.appendChild(svg);
  container.innerHTML = "";
  container.appendChild(wrap);
}

// Single-series line chart over ordered labels (e.g. months) with hover crosshair.
function renderLineChart(container, data, opts = {}) {
  if (data.length === 0) return renderEmptyState(container, "No data yet.");

  const formatValue = opts.formatValue || ((v) => String(v));
  const width = 720;
  const height = 220;
  const padding = { top: 20, right: 16, bottom: 30, left: 36 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const niceMax = maxValue <= 5 ? 5 : Math.ceil(maxValue * 1.15);

  const xFor = (i) => padding.left + (data.length === 1 ? plotWidth / 2 : (i / (data.length - 1)) * plotWidth);
  const yFor = (v) => padding.top + plotHeight - (v / niceMax) * plotHeight;

  const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width: "100%", height, role: "img" });

  [0, 0.5, 1].forEach((frac) => {
    const y = padding.top + plotHeight * (1 - frac);
    svg.appendChild(svgEl("line", { x1: padding.left, y1: y, x2: width - padding.right, y2: y, class: "viz-gridline" }));
    const tick = svgEl("text", { x: padding.left - 8, y: y + 4, "text-anchor": "end", class: "viz-bar-label" });
    tick.textContent = Math.round(niceMax * frac);
    svg.appendChild(tick);
  });

  const linePoints = data.map((d, i) => `${xFor(i)},${yFor(d.value)}`).join(" ");
  const areaPoints = `${xFor(0)},${yFor(0)} ${linePoints} ${xFor(data.length - 1)},${yFor(0)}`;

  svg.appendChild(svgEl("polygon", { points: areaPoints, class: "viz-area" }));
  svg.appendChild(svgEl("polyline", { points: linePoints, class: "viz-line" }));

  data.forEach((d, i) => {
    const x = xFor(i);
    const y = yFor(d.value);
    svg.appendChild(svgEl("circle", { cx: x, cy: y, r: 4, class: "viz-dot" }));

    const label = svgEl("text", { x, y: height - padding.bottom + 18, "text-anchor": "middle", class: "viz-bar-label" });
    label.textContent = d.label;
    svg.appendChild(label);
  });

  if (data.length > 0) {
    const last = data[data.length - 1];
    const endLabel = svgEl("text", { x: xFor(data.length - 1), y: yFor(last.value) - 10, "text-anchor": "middle", class: "viz-value-label" });
    endLabel.textContent = formatValue(last.value);
    svg.appendChild(endLabel);
  }

  const crosshair = svgEl("line", { class: "viz-crosshair", y1: padding.top, y2: height - padding.bottom, x1: -100, x2: -100 });
  svg.appendChild(crosshair);

  const hitArea = svgEl("rect", { x: padding.left, y: padding.top, width: plotWidth, height: plotHeight, fill: "transparent" });
  hitArea.addEventListener("pointermove", (e) => {
    const rect = hitArea.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const frac = Math.min(Math.max(relX / rect.width, 0), 1);
    const idx = Math.round(frac * (data.length - 1));
    const point = data[idx];
    crosshair.setAttribute("x1", xFor(idx));
    crosshair.setAttribute("x2", xFor(idx));
    showTooltip(e.clientX, rect.top + window.scrollY, formatValue(point.value), point.label);
  });
  hitArea.addEventListener("pointerleave", () => {
    crosshair.setAttribute("x1", -100);
    crosshair.setAttribute("x2", -100);
    hideTooltip();
  });
  svg.appendChild(hitArea);

  const wrap = document.createElement("div");
  wrap.className = "viz-svg-wrap";
  wrap.appendChild(svg);
  container.innerHTML = "";
  container.appendChild(wrap);
}

function initTableToggle(button, vizContainer, tableContainer) {
  button.addEventListener("click", () => {
    const showingTable = !tableContainer.hidden;
    tableContainer.hidden = showingTable;
    vizContainer.hidden = !showingTable;
    button.textContent = showingTable ? "View as table" : "View as chart";
  });
}
