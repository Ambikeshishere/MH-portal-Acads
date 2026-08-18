// ============================================================
//  data.js — PUBLISHED-CSV DATA LAYER
//  Fetches the three published Google-Sheets CSVs directly in the
//  browser (no Apps Script backend for data), parses them, caches
//  them, and computes everything the unified Home view needs:
//  KPIs, toppers/bottom students, best/bottom batches, and the
//  per-subject average graph.
//
//  Depends on: core.js (user state)
//  Load AFTER core.js, BEFORE home.js
// ============================================================

const CSV_URLS = {
  tests:    'https://docs.google.com/spreadsheets/d/e/2PACX-1vQS5o-ytwI__9eubWvffSsHeCLSiV6ED9kaLa5tYWuoS7CIdfdEhZxMarJVBCT66DaP5JBwuYs_A77a/pub?output=csv&gid=475005675',
  fbm:      'https://docs.google.com/spreadsheets/d/e/2PACX-1vQS5o-ytwI__9eubWvffSsHeCLSiV6ED9kaLa5tYWuoS7CIdfdEhZxMarJVBCT66DaP5JBwuYs_A77a/pub?output=csv&gid=0',
  students: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQS5o-ytwI__9eubWvffSsHeCLSiV6ED9kaLa5tYWuoS7CIdfdEhZxMarJVBCT66DaP5JBwuYs_A77a/pub?gid=93108683&single=true&output=csv'
};

// Subject columns in the Test Result CSV (0-indexed)
const SUBJ_COLS = { physics: 14, chemistry: 15, maths: 16, zoology: 17, botany: 18 };
const SUBJ_NAMES = ['physics', 'chemistry', 'maths', 'zoology', 'botany'];
const SUBJ_LABELS = { physics: 'Physics', chemistry: 'Chemistry', maths: 'Maths', zoology: 'Zoology', botany: 'Botany' };

// ── STATE ────────────────────────────────────────────
let DATA = { tests: [], fbm: [], students: [], loaded: false, loading: false };

// ── CSV PARSER (handles quoted fields, commas, escaped quotes) ──
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* skip CR */ }
      else field += c;
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// Convert parsed rows (first row = header) into array of objects.
function rowsToObjects(rows) {
  if (!rows.length) return [];
  const header = rows[0].map(h => String(h).trim());
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.length === 1 && r[0] === '') continue; // skip blank lines
    const obj = {};
    for (let j = 0; j < header.length; j++) obj[header[j]] = (r[j] !== undefined ? r[j] : '');
    out.push(obj);
  }
  return out;
}

async function fetchCSV(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('CSV fetch failed: HTTP ' + res.status);
  return rowsToObjects(parseCSV(await res.text()));
}

// Load all three CSVs once, then cache. Returns a promise.
function loadData(force) {
  if (DATA.loaded && !force) return Promise.resolve(DATA);
  if (DATA.loading) return DATA.loading;
  DATA.loading = (async () => {
    const [tests, fbm, students] = await Promise.all([
      fetchCSV(CSV_URLS.tests),
      fetchCSV(CSV_URLS.fbm),
      fetchCSV(CSV_URLS.students)
    ]);
    DATA.tests = tests;
    DATA.fbm = fbm;
    DATA.students = students;
    DATA.loaded = true;
    DATA.loading = false;
    return DATA;
  })();
  return DATA.loading;
}

// ── PARSING HELPERS ──────────────────────────────────
// markspercent arrives as "48.00%" (string with %). Return number.
function parsePct(s) {
  const n = parseFloat(String(s).replace('%', '').trim());
  return isNaN(n) ? 0 : n;
}
function parseNum(s) {
  const n = parseFloat(String(s).trim());
  return isNaN(n) ? 0 : n;
}
// _date arrives as "9 Aug, 2026". Date inputs arrive as "2026-08-09".
// Return a Date or null.
function parseTestDate(s) {
  const str = String(s).trim();
  if (!str) return null;
  // ISO "YYYY-MM-DD" (from <input type="date">)
  const iso = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
  // "9 Aug, 2026"
  const m = str.match(/(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})/);
  if (!m) return null;
  const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const mon = months[m[2].slice(0, 3)];
  if (mon === undefined) return null;
  return new Date(+m[3], mon, +m[1]);
}

// ── ROLE / CENTER SCOPING ────────────────────────────
// Centers the current user is allowed to see.
function accessibleCenters() {
  if (user.level >= 5) return allCenters();
  const centers = user.centers && user.centers.length ? user.centers
    : (user.center ? user.center.split(',').map(s => s.trim()).filter(Boolean) : []);
  return centers;
}

function allCenters() {
  const set = new Set();
  DATA.fbm.forEach(r => { if (r.Center) set.add(r.Center); });
  return [...set];
}

// Subjects a Faculty teaches (mapped to Test Result columns).
function facultySubjects(email) {
  const subs = new Set();
  DATA.fbm.forEach(r => {
    if (r.MailID && r.MailID.trim().toLowerCase() === String(email).toLowerCase()) {
      const s = r.Subject;
      if (SUBJ_LABELS[s.toLowerCase()]) subs.add(s.toLowerCase());
    }
  });
  return [...subs];
}

// Subjects a student studies, based on their stream.
// NEET → no Maths; JEE & Foundation → no Zoology/Botany.
function streamSubjects(stream) {
  const s = String(stream || '');
  if (s.includes('NEET')) return ['physics', 'chemistry', 'zoology', 'botany'];
  return ['physics', 'chemistry', 'maths'];
}

// ── HOME COMPUTATION ─────────────────────────────────
// filters: { centers:[], stream:'', batch:'', dateFrom:'', dateTo:'' }
// Returns KPIs, toppers, bottom, best/bottom batch, subject graph,
// and the filter option lists.
function computeHome(filters) {
  const centers = filters.centers && filters.centers.length ? filters.centers : allCenters();
  const centerSet = new Set(centers);

  // 1) batch → center mapping from FBM (ONLY for center scoping).
  //    FBM is NOT used for batch/student counts — only to know which
  //    faculty teaches which subject in which batch.
  const batchCenter = {};
  DATA.fbm.forEach(r => { if (r.Batch && !batchCenter[r.Batch]) batchCenter[r.Batch] = r.Center; });

  // 2) Accessible batches + students come from the STUDENTS sheet.
  //    Batch count and student count are driven by enrolled students.
  const studentBatch = {};
  const accBatches = new Set();
  const accStudents = new Set();
  DATA.students.forEach(r => {
    const reg = r.regno, b = r.batch;
    if (!reg) return;
    studentBatch[reg] = b;
    if (b && centerSet.has(batchCenter[b])) { accBatches.add(b); accStudents.add(reg); }
  });

  // 3) Faculty in scope
  const accFaculty = new Set();
  DATA.fbm.forEach(r => {
    if (accBatches.has(r.Batch) && r.MailID) accFaculty.add(r.MailID.trim());
  });

  // 4) Filter tests by scope + stream + batch + date range
  const dateFrom = filters.dateFrom ? parseTestDate(filters.dateFrom) : null;
  const dateTo = filters.dateTo ? parseTestDate(filters.dateTo) : null;
  const filteredTests = [];
  for (const t of DATA.tests) {
    if (!accStudents.has(t.reg_no)) continue;
    if (filters.stream && t.stream !== filters.stream) continue;
    if (filters.batch && t.current_batch !== filters.batch) continue;
    if (dateFrom || dateTo) {
      const d = parseTestDate(t._date);
      if (!d) continue;
      if (dateFrom && d < dateFrom) continue;
      if (dateTo && d > dateTo) continue;
    }
    filteredTests.push(t);
  }

  // 5) Per-student aggregation (avg % + latest test for subject marks)
  const stuAgg = {};
  for (const t of filteredTests) {
    const pct = parsePct(t.markspercent);
    if (pct <= 0) continue;
    if (!stuAgg[t.reg_no]) stuAgg[t.reg_no] = { total: 0, count: 0, latest: t };
    stuAgg[t.reg_no].total += pct;
    stuAgg[t.reg_no].count++;
    stuAgg[t.reg_no].latest = t;
  }

  const studentList = Object.keys(stuAgg).map(reg => {
    const a = stuAgg[reg];
    const lt = a.latest;
    return {
      regno: reg,
      name: String(lt.student_name || '').trim(),
      stream: String(lt.stream || '').trim(),
      batch: String(lt.current_batch || '').trim(),
      avg: +(a.total / a.count).toFixed(1),
      physics: parseNum(lt.physics_marks),
      chemistry: parseNum(lt.chemistry_marks),
      maths: parseNum(lt.maths_marks),
      zoology: parseNum(lt.zoology_marks),
      botany: parseNum(lt.botany_marks)
    };
  });
  studentList.sort((a, b) => b.avg - a.avg);

  // 6) Per-batch aggregation
  const batchAgg = {};
  for (const t of filteredTests) {
    const pct = parsePct(t.markspercent);
    if (pct <= 0) continue;
    const b = t.current_batch;
    if (!b) continue;
    if (!batchAgg[b]) batchAgg[b] = { total: 0, count: 0 };
    batchAgg[b].total += pct;
    batchAgg[b].count++;
  }
  const batchList = Object.keys(batchAgg).map(b => ({
    batch: b,
    avg: +(batchAgg[b].total / batchAgg[b].count).toFixed(1)
  })).sort((a, b) => b.avg - a.avg);

  // Top 3 students of a given batch (by avg %)
  function topStudentsOf(batch, n) {
    return studentList.filter(s => s.batch === batch).slice(0, n);
  }

  // 7) Subject averages for a batch (default = best batch)
  function subjectAverages(batch) {
    const sums = { physics: 0, chemistry: 0, maths: 0, zoology: 0, botany: 0 };
    const counts = { physics: 0, chemistry: 0, maths: 0, zoology: 0, botany: 0 };
    for (const t of filteredTests) {
      if (t.current_batch !== batch) continue;
      for (const s of SUBJ_NAMES) {
        const v = parseNum(t[SUBJ_LABELS[s].toLowerCase() + '_marks']);
        if (v > 0) { sums[s] += v; counts[s]++; }
      }
    }
    return SUBJ_NAMES.map(s => ({
      subject: SUBJ_LABELS[s],
      avg: counts[s] > 0 ? +(sums[s] / counts[s]).toFixed(1) : 0,
      count: counts[s]
    }));
  }

  // 8) KPIs
  const totalPct = filteredTests.reduce((s, t) => s + parsePct(t.markspercent), 0);
  const scoredTests = filteredTests.filter(t => parsePct(t.markspercent) > 0).length;
  const totalStudents = filters.batch
    ? studentList.filter(s => s.batch === filters.batch).length
    : accStudents.size;
  const avgScore = scoredTests > 0 ? +(totalPct / scoredTests).toFixed(1) : 0;

  // 9) Average students — within ±5% of the overall average score
  const avgLo = avgScore - 5, avgHi = avgScore + 5;
  const avgStudents = studentList.filter(s => s.avg >= avgLo && s.avg <= avgHi).length;

  // 10) Absent students — their batch had a test but they didn't give it.
  //     Pending = number of batch tests the student missed.
  const batchTestDates = {};
  const studentTestDates = {};
  const studentInfo = {};
  for (const t of DATA.tests) {
    const b = t.current_batch;
    if (b) { if (!batchTestDates[b]) batchTestDates[b] = new Set(); batchTestDates[b].add(t._date); }
    if (t.reg_no) {
      if (!studentTestDates[t.reg_no]) studentTestDates[t.reg_no] = new Set();
      studentTestDates[t.reg_no].add(t._date);
      if (!studentInfo[t.reg_no]) studentInfo[t.reg_no] = { name: String(t.student_name || '').trim(), stream: String(t.stream || '').trim() };
    }
  }
  const absentStudents = [];
  const absentBatch = filters.batch || null;
  for (const reg of accStudents) {
    const b = studentBatch[reg];
    if (absentBatch && b !== absentBatch) continue;
    const batchDates = batchTestDates[b];
    if (!batchDates || batchDates.size === 0) continue;
    const stuDates = studentTestDates[reg] || new Set();
    let pending = 0;
    for (const d of batchDates) if (!stuDates.has(d)) pending++;
    if (pending > 0) {
      const info = studentInfo[reg] || {};
      absentStudents.push({ regno: reg, name: info.name || '', stream: info.stream || '', batch: b, pending });
    }
  }
  absentStudents.sort((a, b) => b.pending - a.pending);

  const bestBatch = batchList[0] || null;
  const bottomBatch = batchList[batchList.length - 1] || null;
  const graphBatch = filters.batch || (bestBatch ? bestBatch.batch : null);

  return {
    kpis: {
      centers: centers,
      totalBatches: filters.batch ? 1 : accBatches.size,
      totalStudents: totalStudents,
      totalFaculty: accFaculty.size,
      avgScore: avgScore,
      avgStudents: avgStudents,
      absentStudents: absentStudents.length
    },
    toppers: studentList.slice(0, 5),
    bottom: studentList.slice(-5).reverse(),
    bestBatch: bestBatch ? { ...bestBatch, topStudents: topStudentsOf(bestBatch.batch, 3) } : null,
    bottomBatch: bottomBatch ? { ...bottomBatch, topStudents: topStudentsOf(bottomBatch.batch, 3) } : null,
    subjectGraph: graphBatch ? { batch: graphBatch, subjects: subjectAverages(graphBatch) } : null,
    absentStudents: absentStudents.slice(0, 10),
    filterOptions: {
      centers: allCenters(),
      streams: [...new Set(DATA.tests.map(t => t.stream).filter(Boolean))].sort(),
      batches: [...accBatches].sort()
    }
  };
}

// ── STUDENT SEARCH (separate tab) ───────────────────
// Returns full test history for a regno, with only the subjects the
// student actually studies (JEE → no Zoo/Bot, NEET → no Maths).
function getStudentDetail(regno) {
  const tests = DATA.tests.filter(t => t.reg_no === regno);
  if (tests.length === 0) return null;
  const first = tests[0];
  const stream = String(first.stream || '').trim();
  const subjects = streamSubjects(stream);
  const history = tests.map(t => {
    const row = {
      date: String(t._date || '').trim(),
      type: String(t._type || '').trim(),
      pattern: String(t._pattern || '').trim(),
      series: String(t.series || '').trim(),
      total: parseNum(t.totalmarks),
      score: parseNum(t.userscore),
      pct: parsePct(t.markspercent),
      rank: t._rank || null,
      subjects: {}
    };
    for (const s of subjects) row.subjects[s] = parseNum(t[s + '_marks']);
    return row;
  });
  history.sort((a, b) => (parseTestDate(a.date) || 0) - (parseTestDate(b.date) || 0));
  return {
    regno: regno,
    name: String(first.student_name || '').trim(),
    stream: stream,
    batch: String(first.current_batch || '').trim(),
    subjects: subjects,
    history: history
  };
}