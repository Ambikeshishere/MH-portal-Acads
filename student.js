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
  const subs = visibleStuSubjects(detail);
  if (!detail.history.length) { wrap.innerHTML = '<div class="empty-msg"><p>No tests</p></div>'; return; }

  // percent per subject per test = subject_marks / userscore * 100
  const rows = detail.history.map(t => {
    const per = {};
    for (const s of subs) per[s] = t.score > 0 ? +((t.subjects[s] / t.score) * 100).toFixed(1) : 0;
    return { date: t.date, per };
  });

  const max = Math.max(1, ...rows.flatMap(r => subs.map(s => r.per[s])));
  wrap.innerHTML = `
    <div class="graph-title">Subject % of total score per test — <strong>${esc(detail.name || detail.regno)}</strong></div>
    ${rows.map(r => `
      <div class="stu-test-block">
        <div class="stu-test-date">${esc(r.date)}</div>
        ${subs.map(s => `
          <div class="subject-bar-row">
            <div class="subject-bar-label">${SUBJ_LABELS[s]}</div>
            <div class="subject-bar-track">
              <div class="subject-bar-fill" style="width:${Math.round((r.per[s] / max) * 100)}%"></div>
            </div>
            <div class="subject-bar-value">${r.per[s]}%</div>
          </div>
        `).join('')}
      </div>
    `).join('')}
  `;
}