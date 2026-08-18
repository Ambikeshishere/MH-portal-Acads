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
      // Populate centers checkboxes
      const centersBox = document.getElementById('signupCenters');
      centersBox.innerHTML = resp.data.centers.map(c =>
        '<label><input type="checkbox" value="' + esc(c) + '"> ' + esc(c) + '</label>'
      ).join('') || '<div class="signup-hint">No centers available</div>';

      // Populate roles
      const roleSel = document.getElementById('signupRole');
      roleSel.innerHTML = '<option value="">Select role...</option>' +
        resp.data.roles.map(r => '<option value="' + esc(r) + '">' + esc(r) + '</option>').join('');
    }
  } catch (_) {}
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
  const password = document.getElementById('signupPassword').value.trim();
  const role = document.getElementById('signupRole').value;

  const centers = Array.from(document.querySelectorAll('#signupCenters input:checked'))
    .map(c => c.value);
  if (!email) { showError('signupError', 'Email required'); return; }
  if (centers.length === 0) { showError('signupError', 'Select at least one center'); return; }
  if (!role) { showError('signupError', 'Select a role'); return; }
  if (password.length < 4) { showError('signupError', 'Password must be at least 4 characters'); return; }

  btn.disabled = true;
  btn.querySelector('span').textContent = 'Submitting...';

  try {
    const resp = await apiGet('signup', { email, centers: centers.join(', '), role, password });
    if (resp.success) {
      document.getElementById('signupSuccess').textContent = resp.message;
      document.getElementById('signupSuccess').classList.add('show');
      document.getElementById('signupForm').reset();
      document.getElementById('signupCenters').innerHTML = '';
      document.getElementById('signupRole').innerHTML = '<option value="">Select role...</option>';
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
  const centers = user.centers && user.centers.length ? user.centers : (user.center ? [user.center] : []);
  const switcher = document.getElementById('centerSwitcher');
  const sel = document.getElementById('centerSelect');
  if (centers.length > 1) {
    switcher.style.display = 'flex';
    sel.innerHTML = centers.map(c => '<option value="' + esc(c) + '"' + (c === user.center ? ' selected' : '') + '>' + esc(c) + '</option>').join('');
  } else {
    switcher.style.display = 'none';
  }
}

function switchCenter() {
  user.center = document.getElementById('centerSelect').value;
  localStorage.setItem('pw_user', JSON.stringify(user));
  // Reload all data for the new center
  dashData = null;
  batchesData = [];
  facultyData = [];
  studentsData = [];
  navigate('dashboard');
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