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

---

## Architecture

```
┌─────────────────────────┐
│      Frontend (HTML)     │
│   index.html + portal.js │
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
│  │ID-Rol│       │     │  │
│  └──────┴──────┴──────┘  │
└─────────────────────────┘
```

The architecture is deliberately simple:
- **No server** — Google Apps Script runs in Google's cloud
- **No database** — Google Sheets IS the database
- **No build step** — plain HTML/CSS/JS, open `index.html` directly
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

Just 4 files that run anywhere a browser exists.

---

## Role-Based Access Control

The portal implements a 7-level hierarchy:

| Level | Role | Can See |
|-------|------|---------|
| 7 | **Admin** | ALL data across ALL centers |
| 6 | **RAH** | All data in their region |
| 5 | **RAOM** | All data in their center |
| 4 | **CH/ACH** | All data in their center |
| 3 | **AOM** | All data in their center |
| 2 | **Subject Head** | Their center's batches only |
| 1 | **Faculty** | Only their own assigned batches and students |

### How it works:
- The `ID-Role` sheet maps each email to a role and center
- The `FBM` sheet maps faculty to batches and subjects
- The backend filters all data based on the logged-in user's level
- **Admin** sees everything; **Faculty** sees only their own data

---

## Google Sheets Structure

### Sheet: `ID-Role`
| Column | Field | Description |
|--------|-------|-------------|
| A | MAIL ID | Faculty email address (login identifier) |
| B | CENTER | Center code/name |
| C | ROLE | Admin, RAH, RAOM, CH/ACH, AOM, Subject Head, Faculty |
| D-G | — | Other fields (unused by portal) |
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

1. Open `portal.js` and find this line:
   ```javascript
   const API_BASE = 'https://script.google.com/macros/s/YOUR_URL_HERE/exec';
   ```
2. Replace with your deployed Web App URL from Step 2

### Step 4: Open the Portal

1. Simply open `index.html` in any modern browser
2. Login with your email and password (default: `Acer@1234`)

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

---

## File Structure

```
MH portal Acads/
├── apps-script.gs      # Google Apps Script backend (paste into Apps Script editor)
├── index.html           # Main HTML portal (open in browser)
├── portal.js            # Frontend JavaScript logic
├── styles.css           # CSS styling with PW theme
└── README.md            # This file
```

### File Responsibilities

| File | Lines | Role |
|------|-------|------|
| `apps-script.gs` | ~320 | Backend API: auth, data processing, role-based filtering |
| `index.html` | ~350 | HTML structure: login, forgot password, 5 main views |
| `portal.js` | ~420 | Frontend logic: API calls, view rendering, state management |
| `styles.css` | ~550 | Styling: PW theme, responsive layout, animations |

---

## Branding & Theme

The portal follows the **Physics Wallah** brand identity:

| Element | Value |
|---------|-------|
| Primary Purple | `#5A4BDA` |
| Dark Background | `#1B2124` |
| Light Purple | `#F1EFFF` |
| Success Green | `#10B981` |
| Warning Amber | `#F59E0B` |
| Danger Red | `#EF4444` |
| Body Background | `#F5F5F7` |
| Typography | Inter (Google Fonts) |

The design features:
- **Split-screen login** with PW purple gradient on the left
- **Dark sidebar** with PW logo and navigation
- **Color-coded stat cards** on the dashboard
- **Performance cards** with color-coded sections (green for toppers, red for absent)
- **Subject-specific color tags** (blue for Physics, green for Chemistry, etc.)
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
