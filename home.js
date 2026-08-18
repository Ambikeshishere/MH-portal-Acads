// ============================================================
//  home.js — UNIFIED HOME VIEW
//  Renders the single Home screen: filter panel, KPI cards,
//  topper/bottom students, best/bottom batches, and the
//  per-subject average graph. All data comes from published CSVs
//  via data.js (no backend data calls).
//
//  Depends on: core.js (user, showLoading, hideLoading, esc),
//              data.js (loadData, computeHome, accessibleCenters)
// ============================================================

let homeFilters = { centers: [], stream: '', batch: '', dateFrom: '', dateTo: '' };

// ── LOAD + RENDER ───────────────────────────────────
async function loadHome() {
  showLoading();
  try {
    await loadData();
    // Default center selection based on role
    if (homeFilters.centers.length === 0) {
      homeFilters.centers = accessibleCenters();
    }
    populateHomeFilters();
    renderHome();
  } catch (e) {
    console.error('Home error:', e);
    const el = document.getElementById('homeError');
    if (el) { el.textContent = 'Data load failed: ' + e.message; el.classList.add('show'); }
  }
  hideLoading();
}

function populateHomeFilters() {
  // Center dropdown (role-scoped)
  const centers = accessibleCenters();
  fillSelect('homeFilterCenter', centers, 'All Centers');
  const centerSel = document.getElementById('homeFilterCenter');
  // If exactly one accessible center, default to it
  if (centers.length === 1) {
    centerSel.value = centers[0];
    homeFilters.centers = centers;
  }

  // Stream/class dropdown — populated after compute (needs all streams)
  // Batch dropdown — populated after compute
}

function renderHome() {
  const result = computeHome(homeFilters);

  // ── Filters: streams + batches (from result) ──
  fillSelect('homeFilterStream', result.filterOptions.streams, 'All Classes');
  fillSelect('homeFilterBatch', result.filterOptions.batches, 'All Batches');
  if (homeFilters.stream) document.getElementById('homeFilterStream').value = homeFilters.stream;
  if (homeFilters.batch) document.getElementById('homeFilterBatch').value = homeFilters.batch;

  // ── KPI cards ──
  const k = result.kpis;
  document.getElementById('homeKpiCenter').textContent = k.centers.length === 1 ? k.centers[0] : (k.centers.length + ' Centers');
  document.getElementById('homeKpiBatches').textContent = k.totalBatches.toLocaleString();
  document.getElementById('homeKpiStudents').textContent = k.totalStudents.toLocaleString();
  document.getElementById('homeKpiFaculty').textContent = k.totalFaculty.toLocaleString();
  document.getElementById('homeKpiAvg').textContent = k.avgScore + '%';
  document.getElementById('homeKpiAvgStudents').textContent = (k.avgStudents || 0).toLocaleString();
  document.getElementById('homeKpiAbsent').textContent = (k.absentStudents || 0).toLocaleString();

  // ── Toppers ──
  renderStudentTable('homeTopperBody', result.toppers);
  // ── Bottom ──
  renderStudentTable('homeBottomBody', result.bottom);

  // ── Best / Bottom batch ──
  renderBatchCard('homeBestBatch', result.bestBatch, true);
  renderBatchCard('homeBottomBatch', result.bottomBatch, false);

  // ── Absent students ──
  renderAbsentStudents(result.absentStudents);

  // ── Subject graph ──
  renderSubjectGraph(result.batchSubjectGraph);
}

function renderAbsentStudents(list) {
  const body = document.getElementById('homeAbsentBody');
  body.innerHTML = (list || []).map((s, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${esc(s.name || '—')}</td>
      <td>${esc(s.regno)}</td>
      <td>${esc(s.stream || '—')}</td>
      <td>${esc(s.batch || '—')}</td>
      <td class="text-center"><span class="status-badge status-poor">${s.pending}</span></td>
    </tr>
  `).join('') || '<tr><td colspan="6" class="empty-msg"><p>No absent students</p></td></tr>';
}

// Which subject columns to show (Faculty → own subjects only)
function visibleSubjects() {
  if (user.level >= 2) return SUBJ_NAMES;
  const subs = facultySubjects(user.email);
  return subs.length ? subs : SUBJ_NAMES;
}

function renderStudentTable(bodyId, students) {
  const subs = visibleSubjects();
  // Dynamic subject header (Faculty sees only own subjects)
  const head = document.getElementById(bodyId === 'homeTopperBody' ? 'homeTopperHead' : 'homeBottomHead');
  if (head) {
    head.innerHTML = '<tr><th style="width:40px">#</th><th>Name</th><th>Stream</th><th>Batch</th>' +
      '<th class="text-center">Avg %</th>' +
      subs.map(s => '<th class="text-center">' + SUBJ_LABELS[s] + '</th>').join('') + '</tr>';
  }
  const body = document.getElementById(bodyId);
  // Show only the top 10 rows (scrollable container handles the rest)
  const rows = (students || []).slice(0, 10);
  body.innerHTML = rows.map((s, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><div class="stu-name">${esc(s.name || '—')}</div><div class="stu-meta">${esc(s.regno)}</div></td>
      <td>${esc(s.stream || '—')}</td>
      <td>${esc(s.batch || '—')}</td>
      <td class="text-center"><span class="status-badge ${scoreBadge(s.avg)}">${s.avg}%</span></td>
      ${subs.map(sub => `<td class="text-center">${s[sub] > 0 ? s[sub] : '—'}</td>`).join('')}
    </tr>
  `).join('') || '<tr><td colspan="' + (5 + subs.length) + '" class="empty-msg"><p>No data</p></td></tr>';
}

function renderBatchCard(id, batch, isBest) {
  const el = document.getElementById(id);
  if (!batch) { el.innerHTML = '<div class="empty-msg"><p>No data</p></div>'; return; }
  const badge = isBest ? 'status-excellent' : 'status-poor';
  const label = isBest ? 'Top Batch' : 'Bottom Batch';
  el.innerHTML = `
    <div class="batch-card-head">
      <div>
        <div class="batch-card-name">${esc(batch.batch)}</div>
        <div class="batch-card-label">${label}</div>
      </div>
      <span class="status-badge ${badge}">${batch.avg}%</span>
    </div>
    <div class="batch-card-students">
      ${batch.topStudents.map((s, i) => `
        <div class="batch-stu-row">
          <span class="batch-stu-rank">${i + 1}</span>
          <span class="batch-stu-name">${esc(s.name || '—')}</span>
          <span class="status-badge ${scoreBadge(s.avg)}">${s.avg}%</span>
        </div>
      `).join('') || '<div class="empty-msg"><p>No students</p></div>'}
    </div>
  `;
}

// Current chart data for home subject-graph hover tooltips
let homeChartData = null;

function renderSubjectGraph(graph) {
  const wrap = document.getElementById('homeSubjectGraph');
  if (!graph || !graph.history || !graph.history.length) {
    wrap.innerHTML = '<div class="empty-msg"><p>No data</p></div>';
    return;
  }
  const history = graph.history;
  const subs = visibleSubjects().filter(s => history.some(t => t.subjects && s in t.subjects));
  homeChartData = { history, subjects: subs };

  const W = 720, H = 340, PL = 46, PR = 30, PT = 24, PB = 46;
  const plotW = W - PL - PR, plotH = H - PT - PB;
  const n = history.length;
  const x = i => PL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = v => PT + plotH - (v / 100) * plotH; // y-axis is 0-100%

  // One line per subject (percent of score per test)
  const lines = subs.map(s => {
    const path = history.map((t, i) => (i === 0 ? 'M' : 'L') + x(i).toFixed(1) + ' ' + y(t.subjects[s] || 0).toFixed(1)).join(' ');
    const points = history.map((t, i) =>
      `<circle cx="${x(i)}" cy="${y(t.subjects[s] || 0)}" r="3.5" fill="${SUBJ_COLORS[s]}" stroke="#0b0b0f" stroke-width="1"/>`).join('');
    return `<path d="${path}" fill="none" stroke="${SUBJ_COLORS[s]}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${points}`;
  }).join('');

  // Y-axis gridlines (0,25,50,75,100)
  const gridlines = [0, 25, 50, 75, 100].map(v => {
    const yy = y(v);
    return `<line x1="${PL}" y1="${yy}" x2="${W - PR}" y2="${yy}" stroke="rgba(255,255,255,0.08)"/>
      <text x="${PL - 8}" y="${yy + 4}" text-anchor="end" class="chart-label">${v}</text>`;
  }).join('');

  // X-axis labels (test dates)
  const xLabels = history.map((t, i) =>
    `<text x="${x(i)}" y="${H - 18}" text-anchor="middle" class="chart-label">${esc(String(t.date).replace(/, \d{4}/, ''))}</text>`).join('');

  // Hover bands (one per test) + legend
  const bandW = n === 1 ? plotW : plotW / n;
  const bands = history.map((t, i) =>
    `<rect x="${x(i) - bandW / 2}" y="${PT}" width="${bandW}" height="${plotH}" fill="transparent"
      onmousemove="moveHomeTooltip(event)" onmouseover="showHomeTooltip(${i})" onmouseout="hideHomeTooltip()"/>`).join('');

  wrap.innerHTML = `
    <div class="graph-title">Subject % of score per test — <strong>${esc(graph.batch)}</strong> (hover a point)</div>
    <div class="chart-wrap">
      <svg viewBox="0 0 ${W} ${H}" class="line-chart" preserveAspectRatio="xMidYMid meet">
        ${gridlines}
        <line x1="${PL}" y1="${PT}" x2="${PL}" y2="${H - PB}" stroke="rgba(255,255,255,0.15)"/>
        <line x1="${PL}" y1="${H - PB}" x2="${W - PR}" y2="${H - PB}" stroke="rgba(255,255,255,0.15)"/>
        ${lines}
        ${xLabels}
        ${bands}
      </svg>
      <div class="chart-legend">
        ${subs.map(s => `<span><i class="legend-dot" style="background:${SUBJ_COLORS[s]}"></i> ${SUBJ_LABELS[s]}</span>`).join('')}
      </div>
      <div class="chart-tooltip" id="homeChartTooltip"></div>
    </div>
  `;
}

function showHomeTooltip(i) {
  const d = homeChartData;
  if (!d || !d.history[i]) return;
  const t = d.history[i];
  const tooltip = document.getElementById('homeChartTooltip');
  tooltip.innerHTML =
    `<div class="tt-date">${esc(t.date)}</div>` +
    `<div class="tt-score">Score: <strong>${t.score}</strong></div>` +
    d.subjects.map(s =>
      `<div class="tt-subj"><span class="tt-dot" style="background:${SUBJ_COLORS[s]}"></span>${SUBJ_LABELS[s]}: ${t.subjects[s] || 0}%</div>`).join('');
  tooltip.style.display = 'block';
}
function moveHomeTooltip(evt) {
  const tooltip = document.getElementById('homeChartTooltip');
  const wrap = tooltip.closest('.chart-wrap');
  const rect = wrap.getBoundingClientRect();
  let left = evt.clientX - rect.left + 14;
  let top = evt.clientY - rect.top - 10;
  if (left + tooltip.offsetWidth > rect.width) left = evt.clientX - rect.left - tooltip.offsetWidth - 14;
  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';
}
function hideHomeTooltip() {
  const tooltip = document.getElementById('homeChartTooltip');
  if (tooltip) tooltip.style.display = 'none';
}

// ── FILTER HANDLERS ─────────────────────────────────
function onHomeCenterChange() {
  const sel = document.getElementById('homeFilterCenter');
  homeFilters.centers = sel.value ? [sel.value] : accessibleCenters();
  homeFilters.batch = '';
  renderHome();
}
function onHomeStreamChange() {
  homeFilters.stream = document.getElementById('homeFilterStream').value;
  homeFilters.batch = '';
  renderHome();
}
function onHomeBatchChange() {
  homeFilters.batch = document.getElementById('homeFilterBatch').value;
  renderHome();
}
function onHomeDateChange() {
  homeFilters.dateFrom = document.getElementById('homeDateFrom').value;
  homeFilters.dateTo = document.getElementById('homeDateTo').value;
  renderHome();
}
function resetHomeFilters() {
  homeFilters = { centers: accessibleCenters(), stream: '', batch: '', dateFrom: '', dateTo: '' };
  document.getElementById('homeFilterCenter').value = '';
  document.getElementById('homeFilterStream').value = '';
  document.getElementById('homeFilterBatch').value = '';
  document.getElementById('homeDateFrom').value = '';
  document.getElementById('homeDateTo').value = '';
  renderHome();
}