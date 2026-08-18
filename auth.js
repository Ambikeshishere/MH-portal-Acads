// ============================================================
//  auth.js — Login, Forgot Password, Signup, Logout, initApp,
//            and the center switcher.
//  Depends on: core.js (apiGet, apiPost, showScreen, navigate,
//              showError, hideAlert, esc, user state)
// ============================================================

// ── LOGIN ──────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const identifier = document.getElementById('loginId').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  if (!identifier || !password) { showError('loginError', 'Please fill all fields'); return; }

  btn.disabled = true;
  btn.querySelector('span').textContent = 'Signing in...';
  hideAlert('loginError');

  try {
    const resp = await apiGet('login', { identifier, password });
    if (resp.success) {
      user = resp.data;
      // Backward compatibility
      if (!user.level && user.hierarchyLevel) user.level = user.hierarchyLevel;
      localStorage.setItem('pw_user', JSON.stringify(user));
      initApp();
    } else {
      showError('loginError', resp.message);
    }
  } catch (_) {
    showError('loginError', 'Connection error. Please try again.');
  }

  btn.disabled = false;
  btn.querySelector('span').textContent = 'Sign In';
}

// ── FORGOT PASSWORD ────────────────────────────────
async function handleForgot(e) {
  e.preventDefault();
  hideAlert('forgotError'); hideAlert('forgotSuccess');
  const id = document.getElementById('forgotId').value.trim();
  if (!id) { showError('forgotError', 'Enter email or PWID'); return; }

  try {
    const resp = await apiGet('forgotPassword', { identifier: id });
    if (resp.success) {
      document.getElementById('forgotSuccess').textContent = 'OTP sent to ' + resp.data.email;
      document.getElementById('forgotSuccess').classList.add('show');
      document.getElementById('otpForm').style.display = 'block';
    } else {
      showError('forgotError', resp.message);
    }
  } catch (_) { showError('forgotError', 'Connection error'); }
}

async function handleVerifyOTP(e) {
  e.preventDefault();
  hideAlert('forgotError'); hideAlert('forgotSuccess');
  const id = document.getElementById('forgotId').value.trim();
  const otp = document.getElementById('otpInput').value.trim();
  if (!otp || otp.length !== 6) { showError('forgotError', 'Enter valid 6-digit OTP'); return; }

  try {
    const resp = await apiGet('verifyOTP', { identifier: id, otp });
    if (resp.success) {
      document.getElementById('forgotSuccess').textContent = 'OTP verified! Set new password.';
      document.getElementById('forgotSuccess').classList.add('show');
      document.getElementById('otpForm').style.display = 'none';
      document.getElementById('resetForm').style.display = 'block';
    } else { showError('forgotError', resp.message); }
  } catch (_) { showError('forgotError', 'Connection error'); }
}

async function handleResetPassword(e) {
  e.preventDefault();
  hideAlert('forgotError'); hideAlert('forgotSuccess');
  const id = document.getElementById('forgotId').value.trim();
  const np = document.getElementById('newPassword').value.trim();
  const cp = document.getElementById('confirmPassword').value.trim();
  if (np.length < 4) { showError('forgotError', 'Password too short (min 4)'); return; }
  if (np !== cp) { showError('forgotError', 'Passwords do not match'); return; }

  try {
    const resp = await apiPost('resetPassword', { identifier: id, newPassword: np });
    if (resp.success) {
      document.getElementById('forgotSuccess').textContent = 'Password updated! Redirecting...';
      document.getElementById('forgotSuccess').classList.add('show');
      setTimeout(() => {
        document.getElementById('resetForm').style.display = 'none';
        document.getElementById('otpForm').style.display = 'none';
        showScreen('loginScreen');
      }, 1500);
    } else { showError('forgotError', resp.message); }
  } catch (_) { showError('forgotError', 'Connection error'); }
}

// ── SIGNUP ─────────────────────────────────────────
function openSignup() {
  showScreen('signupScreen');
  hideAlert('signupError'); hideAlert('signupSuccess');
  document.getElementById('signupForm').reset();
  document.getElementById('signupSuccess').style.display = 'none';
  loadSignupOptions();
}

async function loadSignupOptions() {
  try {
    const resp = await apiGet('getSignupOptions');
    if (resp.success) {
      // Populate centers as a multi-select checkbox list
      const list = document.getElementById('signupCenterList');
      if (list) {
        list.innerHTML = '<label class="center-opt center-opt-all"><input type="checkbox" id="signupCenterAll" onchange="toggleAllSignupCenters(this)"> <span>Select All</span></label>' +
          resp.data.centers.map(c => '<label class="center-opt"><input type="checkbox" value="' + esc(c) + '"> <span>' + esc(c) + '</span></label>').join('');
      }

      // Populate roles
      const roleSel = document.getElementById('signupRole');
      roleSel.innerHTML = '<option value="">Select role...</option>' +
        resp.data.roles.map(r => '<option value="' + esc(r) + '">' + esc(r) + '</option>').join('');
    }
  } catch (_) {}
}

// ── SIGNUP CENTER MULTI-SELECT ──────────────────────
function toggleSignupCenterList() {
  const list = document.getElementById('signupCenterList');
  if (list) list.style.display = list.style.display === 'none' ? 'block' : 'none';
}

function toggleAllSignupCenters(cb) {
  document.querySelectorAll('#signupCenterList input[value]').forEach(i => i.checked = cb.checked);
  updateSignupCenterLabel();
}

function updateSignupCenterLabel() {
  const sel = [...document.querySelectorAll('#signupCenterList input[value]:checked')].map(i => i.value);
  const label = document.getElementById('signupCenterLabel');
  const total = document.querySelectorAll('#signupCenterList input[value]').length;
  if (!label) return;
  if (sel.length === 0) label.textContent = 'Select center(s)...';
  else if (sel.length === total) label.textContent = 'All Centers';
  else if (sel.length === 1) label.textContent = sel[0];
  else label.textContent = sel.length + ' centers selected';
}

function getSelectedSignupCenters() {
  return [...document.querySelectorAll('#signupCenterList input[value]:checked')].map(i => i.value);
}

function resetSignupCenters() {
  const list = document.getElementById('signupCenterList');
  if (!list) return;
  document.querySelectorAll('#signupCenterList input[value]').forEach(i => i.checked = false);
  list.style.display = 'none';
  updateSignupCenterLabel();
}

function updateRoleHint() {
  const role = document.getElementById('signupRole').value;
  const hints = {
    'Faculty': 'Approval goes to your AOM',
    'Subject Head': 'Approval goes to your AOM',
    'AOM': 'Approval goes to your CH/ACH',
    'CH/ACH': 'Approval goes to your RAOM',
    'RAOM': 'Approval goes to your RAH',
    'RAH': 'Approval goes to the Admin'
  };
  document.getElementById('roleHint').textContent = hints[role] || '';
}

async function handleSignup(e) {
  e.preventDefault();
  hideAlert('signupError'); hideAlert('signupSuccess');
  const btn = document.getElementById('signupBtn');
  const email = document.getElementById('signupEmail').value.trim();
  const pwid = document.getElementById('signupPwid').value.trim();
  const center = getSelectedSignupCenters().join(',');
  const role = document.getElementById('signupRole').value;
  const password = document.getElementById('signupPassword').value.trim();

  if (!email) { showError('signupError', 'MAIL ID required'); return; }
  if (!email.endsWith('@pw.live')) { showError('signupError', 'Only @pw.live emails can sign up'); return; }
  if (!pwid) { showError('signupError', 'PWID required'); return; }
  if (!center) { showError('signupError', 'Select at least one center'); return; }
  if (!role) { showError('signupError', 'Select a role'); return; }
  if (password.length < 4) { showError('signupError', 'Password must be at least 4 characters'); return; }

  btn.disabled = true;
  btn.querySelector('span').textContent = 'Submitting...';

  try {
    // Send BOTH params for backward compatibility:
    //   center  → new backend (comma-separated centers)
    //   centers → old deployed backend (comma-separated list)
    const resp = await apiGet('signup', { email, pwid, center, centers: center, role, password });
    if (resp.success) {
      document.getElementById('signupSuccess').textContent = resp.message;
      document.getElementById('signupSuccess').classList.add('show');
      document.getElementById('signupForm').reset();
      resetSignupCenters();
    } else {
      showError('signupError', resp.message);
    }
  } catch (_) { showError('signupError', 'Connection error'); }

  btn.disabled = false;
  btn.querySelector('span').textContent = 'Submit for Approval';
}

// ── INIT APP ───────────────────────────────────────
function initApp() {
  if (!user.level && user.hierarchyLevel) user.level = user.hierarchyLevel;
  showScreen('appScreen');
  document.getElementById('userAvatar').textContent = user.email.charAt(0).toUpperCase();
  document.getElementById('topbarEmail').textContent = user.email;
  document.getElementById('topbarRole').textContent = user.role;
  setupCenterSwitcher();
  dashData = null;
  batchesData = [];
  facultyData = [];
  studentsData = [];
  navigate('dashboard');
}

function setupCenterSwitcher() {
  const switcher = document.getElementById('centerSwitcher');
  // ADMIN / RAH / RAOM (level >= 5): ALWAYS see all centers, no matter what
  // they select. The backend ignores the center filter for these levels, so
  // the switcher is shown for context but never restricts the data.
  if (user.level >= 5) {
    switcher.style.display = 'flex';
    loadAllCentersForSwitcher();
    return;
  }
  const centers = user.centers && user.centers.length ? user.centers : (user.center ? user.center.split(',') : []);
  if (centers.length > 1) {
    switcher.style.display = 'flex';
    // Ensure user.center holds the comma-separated selected centers
    if (!user.center || user.center === '') user.center = centers.join(',');
    renderCenterCheckboxes(centers);
  } else {
    switcher.style.display = 'none';
  }
}

// For level >= 5, populate the switcher with ALL available centers so the
// user can see/select them, but the backend always returns the whole region.
async function loadAllCentersForSwitcher() {
  try {
    const resp = await apiGet('getSignupOptions');
    if (resp.success) {
      user.centers = resp.data.centers;
      user.center = resp.data.centers.join(',');
      renderCenterCheckboxes(resp.data.centers);
    }
  } catch (_) {}
}

function renderCenterCheckboxes(centers) {
  const list = document.getElementById('centerCheckboxList');
  const selected = (user.center || '').split(',').map(s => s.trim()).filter(Boolean);
  list.innerHTML = centers.map(c => {
    const checked = selected.includes(c) ? 'checked' : '';
    return '<label class="center-opt"><input type="checkbox" value="' + esc(c) + '" ' + checked + ' onchange="onCenterToggle()"> <span>' + esc(c) + '</span></label>';
  }).join('');
  updateCenterBtnLabel(selected);
}

function onCenterToggle() {
  let selected = [];
  document.querySelectorAll('#centerCheckboxList input:checked').forEach(i => selected.push(i.value));
  if (selected.length === 0) selected = (user.centers || []).slice(); // empty = all
  user.center = selected.join(',');
  localStorage.setItem('pw_user', JSON.stringify(user));
  updateCenterBtnLabel(selected);
  reloadAllData();
}

function updateCenterBtnLabel(selected) {
  const label = document.getElementById('centerBtnLabel');
  // ADMIN / RAH / RAOM always see the whole region — label stays "All Centers"
  if (user.level >= 5) { label.textContent = 'All Centers'; return; }
  const total = (user.centers || []).length;
  if (selected.length >= total) label.textContent = 'All Centers';
  else if (selected.length === 1) label.textContent = selected[0];
  else label.textContent = selected.length + ' Centers';
}

function toggleCenterDropdown() {
  const dd = document.getElementById('centerDropdown');
  dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
}

function selectAllCenters() {
  document.querySelectorAll('#centerCheckboxList input').forEach(i => i.checked = true);
  onCenterToggle();
}

function clearCenters() {
  document.querySelectorAll('#centerCheckboxList input').forEach(i => i.checked = false);
  onCenterToggle();
}

function reloadAllData() {
  dashData = null;
  batchesData = [];
  facultyData = [];
  studentsData = [];
  navigate(currentView);
}

// ── CENTER CHANGE REQUEST ─────────────────────────────
async function openCenterChange() {
  hideAlert('ccMessage');
  document.getElementById('ccMessage').classList.remove('show');
  document.getElementById('ccCurrentCenter').textContent = (user.center || user.centers || []).join(', ') || '—';
  document.getElementById('centerChangeModal').style.display = 'flex';
  document.getElementById('ccSubmitBtn').disabled = false;
  document.getElementById('ccSubmitBtn').textContent = 'Submit Request';
  try {
    const resp = await apiGet('getSignupOptions');
    if (resp.success) {
      const current = (user.center || '').split(',').map(s => s.trim()).filter(Boolean);
      document.getElementById('ccCenterList').innerHTML = resp.data.centers.map(c => {
        const checked = current.includes(c) ? 'checked' : '';
        return '<label class="center-opt"><input type="checkbox" value="' + esc(c) + '" ' + checked + '> <span>' + esc(c) + '</span></label>';
      }).join('');
    }
  } catch (_) {}
}

function closeCenterChange() {
  document.getElementById('centerChangeModal').style.display = 'none';
}

async function submitCenterChange() {
  const selected = [];
  document.querySelectorAll('#ccCenterList input:checked').forEach(i => selected.push(i.value));
  const msgEl = document.getElementById('ccMessage');
  msgEl.classList.remove('error');
  if (selected.length === 0) { showError('ccMessage', 'Select at least one center'); msgEl.classList.add('error'); return; }
  const btn = document.getElementById('ccSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Submitting...';
  try {
    const resp = await apiGet('requestCenterChange', { email: user.email, newCenter: selected.join(',') });
    if (resp.success) {
      msgEl.textContent = resp.message;
      msgEl.classList.add('show');
      document.getElementById('ccCenterList').innerHTML = '';
      btn.textContent = 'Submitted';
    } else {
      showError('ccMessage', resp.message);
      msgEl.classList.add('error');
      btn.disabled = false;
      btn.textContent = 'Submit Request';
    }
  } catch (_) {
    showError('ccMessage', 'Connection error');
    msgEl.classList.add('error');
    btn.disabled = false;
    btn.textContent = 'Submit Request';
  }
}

// ── LOGOUT ─────────────────────────────────────────
function handleLogout() {
  user = null;
  dashData = null;
  batchesData = [];
  facultyData = [];
  studentsData = [];
  backendVersion = 'unknown';
  localStorage.removeItem('pw_user');
  document.getElementById('loginId').value = '';
  document.getElementById('loginPassword').value = '';
  showScreen('loginScreen');
}