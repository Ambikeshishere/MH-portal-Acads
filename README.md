# PW Maharashtra Region — Faculty Performance Portal

> Physics Wallah | Chhatrapati Sambhajinagar Vidyapeeth

A role-based performance tracking portal built for the **Physics Wallah Maharashtra Region**. It enables Admin, RAH, RAOM, CH/ACH, AOM, Subject Heads, and Faculty to monitor batch performance, student progress, and faculty productivity — all powered by Google Sheets as the backend database.

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Technology Stack](#technology-stack)
5. [Role-Based Access Control](#role-based-access-control)
6. [Google Sheets Structure](#google-sheets-structure)
7. [Setup Guide](#setup-guide)
8. [API Endpoints](#api-endpoints)
9. [File Structure](#file-structure)
10. [Branding & Theme](#branding--theme)
11. [Usage Guide](#usage-guide)
12. [Troubleshooting](#troubleshooting)

---

## Overview

This portal solves a critical need for the PW Maharashtra Region: **centralized visibility into batch performance, student progress, and faculty productivity** across all Vidyapeeth centers.

Instead of manually sifting through spreadsheet data, this tool provides:

- **A clean dashboard** with key metrics at a glance
- **Batch performance ranking** — see which batches are excelling and which need attention
- **Student-level analytics** — individual performance breakdowns by subject
- **Faculty productivity views** — how each faculty member's batches are performing
- **Role-based access** — every user sees only what their role permits

The entire backend runs on **Google Apps Script**, meaning no server costs, no deployment infrastructure — just a spreadsheet and a web app URL.

---

## Features

### Dashboard
- Total Batches, Students, Faculty, and Average Score at a glance
- Top performing batches (highest average scores)
- Batches needing attention (lowest average scores)
- Quick navigation to any batch detail

### Batch Management
- Complete list of all batches with subject tags, student count, and faculty assignments
- **Search and filter** by subject, faculty, or batch name
- **Batch detail view** with:
  - Total / Present / Absent student counts
  - Average, Highest, and Lowest scores
  - **Toppers** (Top 20% of students)
  - **Average** performers (Middle 60%)
  - **Needs Improvement** (Bottom 20%)
  - **Absent** students (enrolled but no test data)
  - Subject-specific filtering (Physics, Chemistry, Maths, Zoology, Botany)
  - Full student table with scores, percentages, and ranks

### Faculty Performance
- All faculty members listed with their assigned batches, subjects, and student counts
- **Average student score** per faculty — a direct measure of teaching effectiveness
- Filterable by center and searchable by name
- Sorted by average score (best performing faculty on top)

### Student Analytics
- Complete student roster with batch, tests taken, average score, and best subject
- Sortable by score, name, or tests taken
- **Student detail view** with:
  - Registration number, batch, tests taken, average score
  - **Subject-wise performance bars** (Physics, Chemistry, Maths, Zoology, Botany)
  - Complete **test history** with per-subject scores, total, percentage, and rank

### Authentication
- **Dual-identifier login**: Email or PWID
- **Default password**: `Acer@1234` (for accounts with blank password field)
- **Forgot Password flow**: OTP-based password reset via email
- **Session persistence**: Auto-login from browser localStorage
- **Self signup with approval**: New users sign up (MAIL ID, PWID, CENTER, ROLE) and their account is created only after an approver approves via the email buttons

---

## Architecture

```
┌─────────────────────────┐
│      Frontend (HTML)     │
│  index.html + loader.js  │
│  + core/auth/dashboard/  │
│  batches/faculty/students│
│  + screen-*.html partials│
│     + styles.css         │
└────────────┬────────────┘
             │  fetch() API calls
             ▼
┌─────────────────────────┐
│   Google Apps Script     │
│     (apps-script.gs)     │
│   doGet() / doPost()     │
└────────────┬────────────┘
             │  SpreadsheetApp API
             ▼
┌─────────────────────────┐
│    Google Spreadsheet    │
│  ┌──────┬──────┬──────┐  │
│  │ FBM  │Students│Tests│  │
│  │ID-Rol│Approvals│    │  │
│  └──────┴──────┴──────┘  │
└─────────────────────────┘
```

The architecture is deliberately simple:
- **No server** — Google Apps Script runs in Google's cloud
- **No database** — Google Sheets IS the database
- **No build step** — plain HTML/CSS/JS, served over HTTP
- **Zero hosting cost** — everything runs on Google's free tier

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Backend | Google Apps Script | API server, data processing, email OTP |
| Database | Google Sheets | Stores all user, batch, student, and test data |
| Frontend | Vanilla HTML5/CSS3/JavaScript | Single-page application with view routing |
| Fonts | Google Fonts (Inter) | Clean, modern typography |
| Icons | Inline SVG | Zero-dependency icons |
| Auth | Custom | Email/PWID + password with OTP reset |

**No frameworks. No dependencies. No npm. No build tools.**

Plain HTML/CSS/JS that runs anywhere a browser exists. Serve over HTTP (`python3 -m http.server`) for the partial loader.

---

## Role-Based Access Control

The portal implements a 7-level hierarchy. **Role, center access, and login credentials are all decided by the `ID-Role` sheet** (email in column A, centers in column B, role in column C, PWID in column D).

| Level | Role | Can See |
|-------|------|---------|
| 7 | **Admin** | ALL data across ALL centers |
| 6 | **RAH** | Whole region — all centers |
| 5 | **RAOM** | Whole region — all centers |
| 4 | **CH/ACH / JEE Head / NEET Head** | Their selected center(s) only (multi-select) |
| 3 | **AOM** | Their selected center(s) only (multi-select) |
| 2 | **Subject Head** | Their selected center(s) only (multi-select) |
| 1 | **Faculty** | Only their own assigned batches and students (via FBM) |

### How it works:
- **Login** resolves by **email (column A) OR PWID (column D)** — both in the `ID-Role` sheet
- Column B can hold **multiple centers** as a comma-separated list
- CH/ACH, AOM, JEE Head, NEET Head, and Subject Head pick their centers with the **multi-select center dropdown** in the top bar
- RAH / RAOM / Admin see the whole region — no center restriction
- **Faculty** sees only their own data through the `FBM` sheet (which maps faculty → batches → subjects). FBM is **not** used for authentication or for manager-level access
- **Center changes** go through approval: users click **Change Center** → the request is emailed to their approver → on approval `ID-Role` column B is updated

---

## Google Sheets Structure

### Sheet: `ID-Role`
| Column | Field | Description |
|--------|-------|-------------|
| A | MAIL ID | Faculty email address (login identifier) |
| B | CENTER | Center code/name |
| C | ROLE | Admin, RAH, RAOM, CH/ACH, AOM, Subject Head, Faculty |
| D | PWID | PW ID (filled on signup approval) |
| E-G | — | Other fields (unused by portal) |
| H | Password | User password (blank = use default `Acer@1234`) |
| I-J | — | Other fields (unused) |
| K | OTP | Stores generated OTP during password reset |

### Sheet: `FBM` (Faculty-Batch Mapping)
| Column | Field | Description |
|--------|-------|-------------|
| A | Batch | Batch code (e.g., `36-LNE01MP`) |
| B | Subject | Physics, Chemistry, Maths, Zoology, Botany |
| C | PWID | Faculty PW ID |
| D | MailID | Faculty email |
| E | Center | Center name |

### Sheet: `Students`
| Column | Field | Description |
|--------|-------|-------------|
| A | regno | Student registration number |
| B | form_status | Form status |
| C | newpayment_checks | Payment verification |
| D | eligibility_status | Eligibility status |
| E | batch | Batch code (matches FBM column A) |

### Sheet: `Test Result`
| Column | Field | Description |
|--------|-------|-------------|
| A | reg_no | Student registration number |
| B | student_name | Full name |
| C | joining_date | Date joined |
| D | acad_year | Academic year |
| E | current_batch | Batch code |
| F | class_stream | Stream/class |
| G | test_type | Type of test |
| H | paper_type | Paper type |
| I | test_pattern | Test pattern |
| J | testseries | Test series name |
| K | test_date | Date of test |
| L | totalmarks | Maximum marks |
| M | userscore | Student's score |
| N | markspercent | Score as percentage |
| O | physics_marks | Physics score |
| P | chemistry_marks | Chemistry score |
| Q | maths_marks | Maths score |
| R | zoology_marks | Zoology score |
| S | botany_marks | Botany score |
| T | test_rank | Rank in test |

---

## Setup Guide

### Step 1: Prepare the Google Spreadsheet

1. Open your Google Spreadsheet containing the 4 sheets (ID-Role, FBM, Students, Test Result)
2. Ensure the column headers match the structure described above
3. Copy the **Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit
   ```

### Step 2: Deploy the Google Apps Script

1. In your spreadsheet, go to **Extensions → Apps Script**
2. Delete any existing code and paste the contents of `apps-script.gs`
3. Find this line and replace the placeholder:
   ```javascript
   const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
   ```
   Replace with your actual Spreadsheet ID.
4. Click **Save** (Ctrl+S)
5. Click **Deploy → New deployment**
6. Settings:
   - **Type**: Web app
   - **Execute as**: Me
   - **Who has access**: Anyone
7. Click **Deploy**
8. Copy the **Web App URL** (looks like `https://script.google.com/macros/s/AKfyc.../exec`)

### Step 3: Configure the Frontend

1. Open `core.js` and find this line:
   ```javascript
   const API_BASE = 'https://script.google.com/macros/s/YOUR_URL_HERE/exec';
   ```
2. Replace with your deployed Web App URL from Step 2

### Step 4: Open the Portal

1. Serve the folder over HTTP (required for the HTML partial loader):
   ```bash
   python3 -m http.server 8888
   ```
2. Open `http://localhost:8888` in any modern browser
3. Login with your email and password (default: `Acer@1234`)

> **Tip:** If you don't want to run a server, open **`index-standalone.html`** directly — it has all HTML and JS inline and works from `file://` or any host.

---

## API Endpoints

All endpoints use `GET` requests except password reset (uses `POST`).

| Action | Method | Parameters | Description |
|--------|--------|------------|-------------|
| `login` | GET | `identifier`, `password` | Authenticate user |
| `forgotPassword` | GET | `identifier` | Generate and email OTP |
| `verifyOTP` | GET | `identifier`, `otp` | Verify OTP |
| `resetPassword` | POST | `identifier`, `newPassword` | Set new password |
| `getDashboard` | GET | `email`, `level`, `center` | Overview statistics |
| `getBatches` | GET | `email`, `level`, `center` | All batches with metrics |
| `getBatchDetail` | GET | `batch`, `subject` (optional) | Detailed batch performance |
| `getFaculty` | GET | `email`, `level`, `center` | Faculty productivity data |
| `getStudents` | GET | `email`, `level`, `center`, `batch` (optional) | Student list with scores |
| `getStudentDetail` | GET | `regno` | Individual student test history |
| `getSignupOptions` | GET | — | Available roles and centers for signup |
| `signup` | GET | `email`, `pwid`, `center`, `role`, `password` | Create an approval request |
| `getApprovalStatus` | GET | `email` | Check status of a user's approval requests |
| `approveRequest` | GET | `token` | Approve a signup request (from email button) — returns minimal HTML page |
| `rejectRequest` | GET | `token` | Reject a signup request (from email button) — returns minimal HTML page |
| `requestCenterChange` | GET | `email`, `newCenter` | Request a center change (goes through approval) |
| `approveCenterChange` | GET | `token` | Approve a center change (from email button) |
| `rejectCenterChange` | GET | `token` | Reject a center change (from email button) |

---

## Signup & Approval Flow

New users sign up through the portal, but their account is **only created after an approver approves** the request.

### Signup form fields
- **MAIL ID** — PW email address (login identifier). **Only `@pw.live` emails can sign up.**
- **PWID** — PW ID (also usable for login, stored in ID-Role column D)
- **CENTER** — single center selected from a dropdown
- **ROLE** — Faculty, Subject Head, AOM, CH/ACH, JEE Head, NEET Head, RAOM, RAH
- **Password** — minimum 4 characters

### Approval chain (next level up)
| Signup Role | Approver |
|-------------|----------|
| Faculty / Subject Head | AOM |
| AOM | CH/ACH |
| CH/ACH / JEE Head / NEET Head | RAOM |
| RAOM | RAH |
| RAH | Admin |

If **no approver exists** for the role in the `ID-Role` sheet, the approval email falls back to the Admin (`ambikesh.srivastava@pw.live`).

### How approval works
1. User submits the signup form → a request is created in the **Approvals** sheet (status `Pending`)
2. An approval email is sent to the approver with two buttons: **Approve** and **Reject**
3. The approver clicks a button:
   - **Approve** → the user is created in the **ID-Role** sheet and login details are emailed to them
   - **Reject** → the request is marked `Rejected` and the applicant is notified
4. Clicking a button opens a minimal confirmation page (not the portal) and the applicant receives a confirmation email
5. The user can then log in with their email + password

### Approvals sheet structure
| Column | Field |
|--------|-------|
| A | Request ID |
| B | Email |
| C | PWID |
| D | Center |
| E | Role |
| F | Password |
| G | Status |
| H | Approver Email |
| I | Created At |
| J | Processed At |
| K | Token |

> **Note:** The `checkApprovalReplies` time trigger is optional (backward compatibility for email replies). The primary approval method is the **Approve / Reject buttons** in the email.

### Center change flow
1. A logged-in user clicks **Change Center** in the top bar and picks their new center(s)
2. A request is created in the **CenterChanges** sheet (status `Pending`) and an email with Approve/Reject buttons goes to their approver
3. On **Approve** → `ID-Role` column B is updated with the new center(s) and the user is emailed
4. On **Reject** → the request is marked `Rejected` and the user is notified

### CenterChanges sheet structure
| Column | Field |
|--------|-------|
| A | Request ID |
| B | Email |
| C | Old Center |
| D | New Center |
| E | Status |
| F | Approver Email |
| G | Created At |
| H | Processed At |
| I | Token |

---

## File Structure

The frontend is split into **modular JS files** and **HTML partials** for clean, maintainable code. `loader.js` injects the HTML partials at runtime.

```
MH portal Acads/
├── apps-script.gs        # Google Apps Script backend (paste into Apps Script editor)
├── index.html            # HTML shell: placeholders + script tags
├── loader.js             # Loads HTML partials, fires pw:html-ready
├── core.js               # API base, shared state, navigation, api helpers, utilities, auto-login
├── auth.js               # Login, forgot password, signup, logout, center switcher
├── dashboard.js          # Dashboard stats + top/bottom batches
├── batches.js            # Batch list, filters, batch detail
├── faculty.js            # Faculty list, filters, render
├── students.js           # Student list, filters, render, student detail
├── perf.js               # Shared toppers/average/bottom/absentee renderers
├── screen-login.html     # Login screen partial
├── screen-forgot.html    # Forgot password screen partial
├── screen-signup.html    # Signup screen partial (MAIL ID, PWID, CENTER, ROLE)
├── screen-app.html       # Main app screen (top navbar + all views)
├── overlay.html          # Loading overlay partial
├── index-standalone.html # Single-file build (all HTML+JS inline, no server needed)
├── styles.css            # CSS styling with black + red premium theme
└── README.md             # This file
```

### File Responsibilities

| File | Role |
|------|------|
| `apps-script.gs` | Backend API: auth, signup/approval, data processing, role-based filtering |
| `index.html` | HTML shell with placeholder divs and ordered script tags |
| `loader.js` | Fetches each `screen-*.html` partial and injects it, then fires `pw:html-ready` |
| `core.js` | `API_BASE`, shared state, `showScreen`/`navigate`, `apiGet`/`apiPost`, utilities, auto-login |
| `auth.js` | Login, forgot/OTP/reset, signup, `initApp`, center switcher, logout |
| `dashboard.js` | Dashboard stats + top/bottom batch rendering |
| `batches.js` | Batch list, filters, batch detail view |
| `faculty.js` | Faculty list, filters, rendering |
| `students.js` | Student list, filters, rendering, student detail |
| `perf.js` | Shared performance list renderers (toppers, average, bottom, absentees) |
| `screen-*.html` | One screen per file, injected by `loader.js` |
| `index-standalone.html` | Single-file build with all HTML + JS inline — works from `file://` or any host |
| `styles.css` | Black + red premium theme, responsive layout, animations |

> **Note:** The modular frontend (`index.html`) must be served over HTTP (e.g. `python3 -m http.server 8888` or GitHub Pages) because `loader.js` uses `fetch()` to load the HTML partials. If you only want a single file that works anywhere, use **`index-standalone.html`** instead.

---

## Branding & Theme

The portal uses a **black + red premium** theme:

| Element | Value |
|---------|-------|
| Brand Red | `#EF4444` |
| Red Dark | `#B91C1C` |
| Red Bright | `#F87171` |
| Deep Black (bg) | `#0A0A0B` |
| Card Surface | `#151518` |
| Border | `#26262B` |
| Text | `#F5F5F7` |
| Text Secondary | `#A1A1AA` |
| Typography | Inter (Google Fonts) |

The design features:
- **Split-screen login** with black background + red radial gradients on the left
- **Red gradient buttons** (`#EF4444 → #B91C1C`) with glow shadows
- **Dark top navbar** with red active states
- **Dark cards and tables** with subtle red accents
- **Red glow effects** on logo, avatar, and loading spinner
- **Responsive design** that works on mobile, tablet, and desktop

---

## Usage Guide

### For Admins
1. Login → Dashboard shows all batches, students, and faculty across all centers
2. Go to **Batches** to see all batches ranked by average score
3. Click **View** on any batch to see detailed performance breakdown
4. Go to **Faculty** to see all faculty ranked by student performance
5. Go to **Students** to browse all students, sort by score, and click **View** for individual details

### For Faculty
1. Login → Dashboard shows only your assigned batches
2. **Batches** tab shows your batches with subject-wise performance
3. Click **View** on a batch to see your students categorized as Toppers / Average / Needs Improvement
4. Use the **Subject** filter to see performance for a specific subject
5. Go to **Students** to see individual student details and test histories

### Password Reset
1. Click **Forgot Password** on the login screen
2. Enter your email or PWID
3. Check your email for the 6-digit OTP
4. Enter OTP and set a new password (minimum 4 characters)

### Signup & Approval
1. Click **Sign Up** on the login screen
2. Fill in **MAIL ID**, **PWID**, select **CENTER** from the dropdown, choose **ROLE**, and set a **Password**
3. Submit — your request goes to your reporting manager (or the Admin if no approver exists for your role)
4. Check your email after approval — you will receive login credentials and can sign in

---

## Troubleshooting

### "User not found"
- Check that your email exists in the `ID-Role` sheet (Column A)
- If logging in with PWID, ensure the PWID exists in the `FBM` sheet (Column C) and has a linked email (Column D)

### "Invalid password"
- Default password is `Acer@1234` (used when Column H is blank in ID-Role)
- If a custom password is set in Column H, use that instead
- Passwords are case-sensitive

### Dashboard shows 0 batches / 0 students
- Ensure the `FBM` sheet has data rows (not just headers)
- Ensure the `Students` sheet has batch codes matching the FBM batch codes
- Check that the Spreadsheet ID in `apps-script.gs` is correct

### API returns "Exception: Illegal spreadsheet id"
- The `SPREADSHEET_ID` in `apps-script.gs` is still the placeholder
- Replace it with your actual Spreadsheet ID

### Portal not loading / CORS errors
- Ensure the Apps Script is deployed as a **Web App** with "Anyone" access
- Re-deploy if needed (Deploy → Manage deployments → Edit → New version)

### Slow loading
- The Test Result sheet may be very large. First load might take 5-10 seconds
- Subsequent loads within the same session are faster due to browser caching

---

## Credits

Built for **Physics Wallah — Maharashtra Region, Chhatrapati Sambhajinagar Vidyapeeth**

Brand identity and color palette sourced from [pw.live](https://www.pw.live)

---

*This is an internal tool. Not affiliated with PhysicsWallah Limited's official products.*
