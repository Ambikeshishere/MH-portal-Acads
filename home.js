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
  renderSubjectGraph(result.subjectGraph);
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
  body.innerHTML = students.map((s, i) => `
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

function renderSubjectGraph(graph) {
  const wrap = document.getElementById('homeSubjectGraph');
  if (!graph) { wrap.innerHTML = '<div class="empty-msg"><p>No data</p></div>'; return; }
  const subs = visibleSubjects();
  const max = Math.max(1, ...graph.subjects.filter(s => subs.includes(s.subject.toLowerCase())).map(s => s.avg));
  wrap.innerHTML = `
    <div class="graph-title">Subject Averages — <strong>${esc(graph.batch)}</strong></div>
    <div class="subject-bars">
      ${graph.subjects.filter(s => subs.includes(s.subject.toLowerCase())).map(s => `
        <div class="subject-bar-row">
          <div class="subject-bar-label">${s.subject}</div>
          <div class="subject-bar-track">
            <div class="subject-bar-fill" style="width:${Math.round((s.avg / max) * 100)}%"></div>
          </div>
          <div class="subject-bar-value">${s.avg}</div>
        </div>
      `).join('')}
    </div>
  `;
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