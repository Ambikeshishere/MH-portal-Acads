// ============================================================
//  student.js — STUDENT SEARCH TAB
//  Enter a reg no → full test history with subject-wise marks and
//  a per-test subject % graph. Faculty sees only their own subjects.
//  Percent per subject = subject_marks / userscore * 100.
//  JEE students don't study Zoology/Botany; NEET don't study Maths.
//
//  Depends on: core.js (user, esc, scoreBadge), data.js
// ============================================================

function loadStuView() {
  // Ensure data is loaded so search works immediately
  loadData().catch(() => {});
}

function searchStu() {
  const input = document.getElementById('studentSearchInput');
  const regno = input.value.trim();
  const err = document.getElementById('studentError');
  err.classList.remove('show');
  err.textContent = '';
  const result = document.getElementById('studentResult');
  if (!regno) { err.textContent = 'Enter a reg no'; err.classList.add('show'); return; }

  showLoading();
  loadData().then(() => {
    const detail = getStudentDetail(regno);
    hideLoading();
    if (!detail) {
      result.style.display = 'none';
      err.textContent = 'Student not found: ' + regno;
      err.classList.add('show');
      return;
    }
    result.style.display = 'block';
    renderStuDetail(detail);
  }).catch(() => { hideLoading(); err.textContent = 'Data load failed'; err.classList.add('show'); });
}

function renderStuDetail(detail) {
  // ── Student info ──
  const tests = detail.history.length;
  const avg = tests > 0 ? +(detail.history.reduce((s, t) => s + t.pct, 0) / tests).toFixed(1) : 0;
  document.getElementById('studentDetailStats').innerHTML = `
    <div class="detail-stat"><div class="ds-value">${esc(detail.name || '—')}</div><div class="ds-label">Name</div></div>
    <div class="detail-stat"><div class="ds-value">${esc(detail.regno)}</div><div class="ds-label">Reg No</div></div>
    <div class="detail-stat"><div class="ds-value">${esc(detail.stream || '—')}</div><div class="ds-label">Stream</div></div>
    <div class="detail-stat"><div class="ds-value">${esc(detail.batch || '—')}</div><div class="ds-label">Batch</div></div>
    <div class="detail-stat"><div class="ds-value">${tests}</div><div class="ds-label">Tests</div></div>
    <div class="detail-stat"><div class="ds-value">${avg}%</div><div class="ds-label">Avg %</div></div>
  `;

  // ── Subject % graph (per test) ──
  renderStuGraph(detail);

  // ── Test history table ──
  const subs = visibleStuSubjects(detail);
  const head = document.getElementById('studentTestHead');
  head.innerHTML = '<tr><th>Date</th><th>Type</th>' +
    subs.map(s => '<th class="text-center">' + SUBJ_LABELS[s] + '</th>').join('') +
    '<th class="text-center">Total</th><th class="text-center">Score</th><th class="text-center">%</th><th class="text-center">Rank</th></tr>';

  const body = document.getElementById('studentTestBody');
  body.innerHTML = detail.history.map(t => `
    <tr>
      <td>${esc(t.date)}</td>
      <td>${esc(t.type)}</td>
      ${subs.map(s => `<td class="text-center">${t.subjects[s] > 0 ? t.subjects[s] : '—'}</td>`).join('')}
      <td class="text-center">${t.total}</td>
      <td class="text-center">${t.score}</td>
      <td class="text-center"><span class="status-badge ${scoreBadge(t.pct)}">${t.pct}%</span></td>
      <td class="text-center">${t.rank || '—'}</td>
    </tr>
  `).join('') || '<tr><td colspan="' + (6 + subs.length) + '" class="empty-msg"><p>No tests</p></td></tr>';
}

// Subjects to show for a student: their stream subjects, but Faculty
// only sees their own subjects.
function visibleStuSubjects(detail) {
  let subs = detail.subjects;
  if (user.level < 2) {
    const own = facultySubjects(user.email);
    if (own.length) subs = subs.filter(s => own.includes(s));
  }
  return subs;
}

function renderStuGraph(detail) {
  const wrap = document.getElementById('studentSubjectGraph');
  const history = detail.history;
  if (!history.length) { wrap.innerHTML = '<div class="empty-msg"><p>No tests</p></div>'; return; }

  // Score per test (chronological)
  const scores = history.map(t => t.score);
  const maxScore = Math.max(...scores, 1);
  const n = history.length;

  // ── SVG line graph ──
  const W = 720, H = 320, PL = 50, PR = 30, PT = 30, PB = 46;
  const plotW = W - PL - PR, plotH = H - PT - PB;
  const x = i => PL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = v => PT + plotH - (v / maxScore) * plotH;

  // Main line path
  const linePath = history.map((t, i) => (i === 0 ? 'M' : 'L') + x(i).toFixed(1) + ' ' + y(t.score).toFixed(1)).join(' ');

  // Prediction: linear regression on (index, score), extend 2 future points
  let predPath = '';
  let predPoints = [];
  if (n >= 2) {
    const sumX = history.reduce((s, _, i) => s + i, 0);
    const sumY = scores.reduce((s, v) => s + v, 0);
    const sumXY = history.reduce((s, t, i) => s + i * t.score, 0);
    const sumXX = history.reduce((s, _, i) => s + i * i, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    const lastX = n - 1;
    predPoints = [lastX, lastX + 1, lastX + 2].map(ix => ({ ix, v: slope * ix + intercept }));
    predPath = predPoints.map((p, i) => (i === 0 ? 'M' : 'L') + x(p.ix).toFixed(1) + ' ' + y(Math.max(0, p.v)).toFixed(1)).join(' ');
  }

  // Y-axis gridlines (4)
  const gridlines = [0, 1, 2, 3, 4].map(g => {
    const val = (maxScore / 4) * g;
    const yy = y(val);
    return `<line x1="${PL}" y1="${yy}" x2="${W - PR}" y2="${yy}" stroke="rgba(255,255,255,0.08)"/>
      <text x="${PL - 8}" y="${yy + 4}" text-anchor="end" class="chart-label">${Math.round(val)}</text>`;
  }).join('');

  // X-axis labels (test dates)
  const xLabels = history.map((t, i) => {
    const short = String(t.date).replace(/, \d{4}/, '');
    return `<text x="${x(i)}" y="${H - 18}" text-anchor="middle" class="chart-label">${esc(short)}</text>`;
  }).join('');

  // Points
  const points = history.map((t, i) =>
    `<circle cx="${x(i)}" cy="${y(t.score)}" r="4" fill="#F43F5E" stroke="#fff" stroke-width="1.5">
       <title>${esc(t.date)}: ${t.score}/${t.total}</title></circle>`).join('');

  wrap.innerHTML = `
    <div class="graph-title">Score per Test — <strong>${esc(detail.name || detail.regno)}</strong> (prediction dotted)</div>
    <svg viewBox="0 0 ${W} ${H}" class="line-chart" preserveAspectRatio="xMidYMid meet">
      ${gridlines}
      <line x1="${PL}" y1="${PT}" x2="${PL}" y2="${H - PB}" stroke="rgba(255,255,255,0.15)"/>
      <line x1="${PL}" y1="${H - PB}" x2="${W - PR}" y2="${H - PB}" stroke="rgba(255,255,255,0.15)"/>
      ${predPath ? `<path d="${predPath}" fill="none" stroke="#22D3EE" stroke-width="2" stroke-dasharray="6 5"/>` : ''}
      <path d="${linePath}" fill="none" stroke="#F43F5E" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${points}
      ${xLabels}
    </svg>
    <div class="chart-legend">
      <span><i class="legend-dot" style="background:#F43F5E"></i> Actual Score</span>
      <span><i class="legend-dot" style="background:#22D3EE"></i> Prediction</span>
    </div>
  `;
}