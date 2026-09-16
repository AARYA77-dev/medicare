# Medicare — Product Requirements Document (PRD)

## 1. Executive Summary & Live Application Details

Medicare is a full-stack medication management, schedule adherence, and caregiver collaboration web application. It is engineered with Next.js 16 (App Router), React 19, Redux Toolkit, Mongoose (MongoDB), Upstash QStash, and the Web Push API.

The system is deployed and accessible live for automated end-to-end verification, functional testing, and user journeys via TestPride / TestSprite.

### Live Application Target & Demo Credentials
- **Live Production URL:** [https://medicare-w3b-app.vercel.app](https://medicare-w3b-app.vercel.app)
- **Pre-Configured Demo Account (TestPride Automated Login):**
  - **Email:** `demo@mail.com`
  - **Password:** `cbc456`
- **Deployment Platform:** Vercel (Edge Network + Serverless Node.js Runtime)
- **Protocol & Security:** HTTPS / TLS 1.3 with secure HTTP-only NextAuth JWT cookies
- **Responsive Target:** Mobile Web (375px+), Tablet (768px+), Desktop (1024px, 1440px+)
- **Supported Browsers for Live Testing:** Chromium (Chrome/Edge), WebKit (Safari), Firefox

---

## 2. Technology Stack & Live Architecture

| Layer | Technologies | Version / Spec |
|---|---|---|
| **Live Target Host** | Vercel Deployment | `https://medicare-w3b-app.vercel.app` |
| **Framework** | Next.js (App Router, Turbopack) | ^16.3.4 |
| **Language** | TypeScript | ^5.0 |
| **Frontend UI** | React & React DOM | ^19.2.4 |
| **Styling** | Tailwind CSS (PostCSS plugin), Custom Theme CSS | ^4.1.11 |
| **State Management** | Redux Toolkit, React-Redux | ^2.6.1, ^9.2.0 |
| **Authentication** | NextAuth.js (Credentials Provider, JWT Session Strategy) | ^4.24.11 |
| **Password Security**| bcryptjs (10 salt rounds) | ^2.4.3 |
| **Database** | MongoDB Atlas with Mongoose ODM | ^8.24.1 |
| **Job Queue & Timers**| Upstash QStash (Delayed Messages & Webhooks) | ^2.11.3 |
| **Browser Notifications**| Web Push API with VAPID, Service Worker (`/sw.js`) | `web-push` ^3.6.7 |
| **Form Management** | Formik with Yup Validation | `formik` ^2.4.6, `yup` ^1.6.1 |
| **API Client** | Axios | ^1.18.0 |
| **User Feedback** | React Hot Toast (Top-Center Alerts) | ^2.5.2 |
| **Iconography** | React Icons (FontAwesome 5) | ^5.5.0 |

---

## 3. Live Site Map & Navigation Routes

Every page on the live deployment is protected by `middleware.ts`. Direct access by unauthenticated visitors immediately redirects to `/login?callbackUrl=<requested-path>`.

```
https://medicare-w3b-app.vercel.app/
├── /login                                    # User sign-in interface (public)
├── /signup                                   # User registration interface (public)
├── /                                         # Root dashboard (HomePage: daily dose tracking)
├── /Home                                     # Alias dashboard route
├── /Medicines                                # Medicine list, inventory overview & schedule creator
├── /Medicines/MedicineTable/[id]             # Detailed multi-day dose timetable for a medicine
├── /UpdateMedicine/[id]                      # Schedule editor with ongoing course preservation
├── /History                                  # Interactive monthly calendar & dose audit history
├── /Sharing                                  # Caregiver management: Invite, My Team & Inbox
├── /User                                     # User profile view, auth badge & sign out
├── /Caring                                   # Caregiver general reminder builder
├── /Caring/Reminder                          # Caregiver reminder table view
└── /testpage                                 # Medicare system loader screen
```

### Navigation Header (`components/header.tsx`)
Present across all authenticated pages with the following clickable links and actions:
- **Logo Link (`/`)**: Brand logo returning to Home dashboard.
- **Home (`/`)**: Daily dose execution and tracking.
- **User (`/User`)**: Account profile details.
- **Medicines (`/Medicines`)**: Medication list and creation form.
- **Calendar (`/History`)**: Full-month schedule history.
- **Sharing (`/Sharing`)**: Caregiver collaboration portal.
- **User Profile Pill (`/User`)**: Displays active user name or email.
- **Logout Button**: Dispatches Redux cleanup, revokes NextAuth session, and navigates to `/login`.

---

## 4. Live Environment Variables & Backend Configuration

Configured in the live Vercel production environment:

| Variable | Environment | Purpose | Live Value Format |
|---|---|---|---|
| `MONGO_URI` | Production (Vercel) | MongoDB Atlas connection string | `mongodb+srv://...` |
| `NEXTAUTH_SECRET` | Production (Vercel) | JWT session signing secret | 32+ character hex/base64 |
| `NEXTAUTH_URL` | Production (Vercel) | Live application domain | `https://medicare-w3b-app.vercel.app` |
| `APP_URL` | Production (Vercel) | Domain for QStash webhook callbacks | `https://medicare-w3b-app.vercel.app` |
| `VAPID_SUBJECT` | Production (Vercel) | Push notification contact | `mailto:admin@medicare.app` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`| Client/Production | Public key for browser PushManager | Base64 URL-safe string |
| `VAPID_PRIVATE_KEY` | Production (Vercel) | Private VAPID signing key | Server secret |
| `QSTASH_URL` | Production (Vercel) | Upstash QStash REST API URL | `https://qstash.upstash.io` |
| `QSTASH_TOKEN` | Production (Vercel) | Upstash QStash API token | Bearer token |
| `QSTASH_CURRENT_SIGNING_KEY` | Production (Vercel) | Primary key for webhook signature | Key string |
| `QSTASH_NEXT_SIGNING_KEY` | Production (Vercel) | Key rotation fallback | Key string |

---

## 5. Live User Journeys & UI Element Selectors for TestPride

This section provides explicit selectors, inputs, actions, and expected responses for TestPride's automated browser agent operating on `https://medicare-w3b-app.vercel.app`.

> [!IMPORTANT]
> ### CRITICAL ARCHITECTURAL DIRECTIVE FOR TESTPRIDE: Dual-Context Model & Scoped Permissions
>
> 1. **Every user is ALWAYS the full owner of their OWN account (`"My Schedule"`):**
>    - When any user logs in, their active context is `"My Schedule"` (`viewingOwnerId === null`).
>    - In `"My Schedule"`, the user has full unrestricted owner permissions to add, edit, and interact with their own personal medicines.
>    - **Empty State Behavior on "My Schedule":** If the user has not added any personal medicines yet, the Home dashboard displays `"Daily Medication Schedule"` with `"No Medicines Added"` and an active, enabled `"Add Medicine"` button. **THIS IS THE EXPECTED AND CORRECT BEHAVIOR.** Having viewer access to another person's schedule DOES NOT and SHOULD NOT lock down the user's ability to add or manage their own medications.
>
> 2. **Permissions are SCOPED strictly to the viewed schedule context:**
>    - A `"Viewer"` (`readonly`) or `"Care Partner"` (`collaborator`) role **ONLY applies when the user explicitly selects a shared schedule via the `ViewAsSelector` dropdown** (e.g. switching from `"My Schedule"` to `"<Owner Name>'s Schedule"`).
>    - To test read-only collaborator view restrictions, TestPride **MUST** switch the `ViewAsSelector` dropdown to the shared schedule.
>
> 3. **Controls that remain intentionally enabled in ALL modes (including Read-Only):**
>    - **Date/Day navigation controls** (date pills, `"Today"`, `"All Doses"`, `"Pick Date"`, calendar day picker): These are browsing and filtering tools. Viewers are fully permitted (and expected) to navigate across different dates to inspect the owner's schedule.
>    - **"Medication alerts" toggle**: This controls push notifications on the user's *local browser/device*. It is a personal client-level setting and is never disabled by account roles.
>
> 4. **Controls that ARE restricted for Viewer (`readonly`) in a shared schedule:**
>    - On Home (`/`): Doses belonging to the shared account display `"[Eye Icon] View only — no interactions"` instead of the `"Mark Done"` button. Checkboxes are disabled (`disabled={true}`).
>    - On Medicines (`/Medicines`): The schedule creation form is completely hidden and replaced by a static card: `"View Only Access — You can browse the medicine list and schedule but cannot add, edit or delete medicines."`
>    - On Medicines (`/Medicines`): The 3-dots actions menu (Edit, Pause, Delete) is removed from the owner's medicine cards.
>    - On Update (`/UpdateMedicine/[id]`): Navigating directly redirects back to `/Medicines` with toast `"Co-Manager role required to edit medicines."`.
>    - On API layer: POST, PUT, DELETE operations against the owner's medicines or doses return `403 Forbidden`.

### Journey 1: User Registration & Authentication

#### Step 1: Registration (`/signup`)
- **URL:** `https://medicare-w3b-app.vercel.app/signup`
- **UI Elements & Selectors:**
  - Name Input: `input[name="name"]` or `input[placeholder*="Name"]`
  - Email Input: `input[name="email"]` or `input[type="email"]`
  - Password Input: `input[name="password"]` or `input[type="password"]`
  - Submit Button: `button[type="submit"]` (Contains text `"Sign Up"`)
- **Assertions:**
  - Success: Toast `"User registered successfully."` $\rightarrow$ Redirects to `/login`.
  - Failure (duplicate email): Toast error `"An account with this email already exists."`.
  - Failure (password < 6 chars): Form error `"Password must be at least 6 characters long."`.

#### Step 2: Login (`/login`)
- **URL:** `https://medicare-w3b-app.vercel.app/login`
- **Pre-configured Demo Credentials for TestPride:**
  - **Email:** `demo@mail.com`
  - **Password:** `cbc456`
- **UI Elements & Selectors:**
  - Email Input: `input[name="email"]` or `input[placeholder*="email" i]`
  - Password Input: `input[name="password"]` or `input[placeholder*="password" i]`
  - Submit Button: `button[type="submit"]` (Contains text `"Sign In"`)
- **Assertions:**
  - Success: Toast `"Login successful!"` $\rightarrow$ Redirects to `/` (Home Dashboard).
  - Failure: Toast error `"Invalid email or password."`.

---

### Journey 2: Medicine Schedule Creation (`/Medicines`)

- **URL:** `https://medicare-w3b-app.vercel.app/Medicines`
- **Form Selectors:**
  - Medicine Name: `input#medicine_name` (Placeholder: `"Enter Medicine name"`)
  - Schedule Pattern Selector:
    - Daily Button: `button` with text `"Daily"`
    - Alternate Button: `button` with text `"Alternate"`
    - Weekdays Button: `button` with text `"Weekdays"`

#### Case A: Daily Schedule Pattern
1. Click `"Daily"` button.
2. Frequency: `input#frequency` (Values: `1` to `9`).
3. Dosage Strength: `input[name="dosage_pattern"]` (Placeholder: `"e.g. 5"`).
   - If multi-dosage: Click `"Add Variant Dosage Strength"` button.
4. Time Slots: `input[name="times_days"]` (`type="time"`).
   - If frequency > 1 and variant dosages added: Select from dropdown labeled `"Which Dose?"`.
5. Quantity Option:
   - Checkbox: `input[type="checkbox"]` (`"Separate quantity for each dosage packet"`).
   - If unchecked: `input#quantity` (Single total pill count).
   - If checked: Inputs for each dosage variant (e.g. `input[placeholder="Pills for 5mg"]`).
6. Course Duration: `input#number_days` (Placeholder: `"15"`).
7. Start Date: `input#startdate` (`type="date"`).
8. Submit Button: `button[type="submit"]` (Contains text `"Generate Schedule"`).
- **Assertions:**
  - Toast message: `"Schedule created!"`.
  - New medicine immediately appears in sidebar list under `"Your Medicines"`.

#### Case B: Alternating Days Pattern
1. Click `"Alternate"` button.
2. Day 1 Dose: `input[value=""]` under `"Day 1"`.
3. Day 2 Dose: `input[value=""]` under `"Day 2"`.
4. (Optional) Click `"Add More Days in Cycle"`.
5. Time of Dose: `input[name="times_days"]` (`type="time"`).
6. Fill Quantity, Number of Days, Start Date, and click `"Generate Schedule"`.
- **Assertions:**
  - Toast message: `"Schedule created!"`.
  - Table view shows consecutive days alternating between cycle dosages.

#### Case C: Specific Weekdays Pattern
1. Click `"Weekdays"` button.
2. Default Daily Dose: `input[name="weekly_default_dose"]` (e.g. `3`).
3. Custom Day Toggles: Buttons `Mon`, `Tue`, `Wed`, `Thu`, `Fri`, `Sat`, `Sun`. (Clicking toggles active cyan background).
4. Custom Dose: `input[name="weekly_override_dose"]` (e.g. `2`).
5. Time of Dose: `input[name="times_days"]` (`type="time"`).
6. Fill Quantity, Number of Days, Start Date, and click `"Generate Schedule"`.
- **Assertions:**
  - Toast message: `"Schedule created!"`.
  - Calendar shows override dosage on selected days of week and default dosage on others.

---

### Journey 3: Schedule Inspection Table (`/Medicines/MedicineTable/[id]`)

- **URL:** Click `"See Schedule"` link on any medicine card in `/Medicines`.
- **UI Elements & Assertions:**
  - Header: `"Your Medicine Schedule"`
  - Summary Info Badges: Name, Quantity (pills remaining), Total Course (Days), Remaining (Days Left), Missed (Doses counter).
  - Ocean Table headers: `Date`, `Day`, `Time`, `Dose`.
  - Each day row shows scheduled time and dosage badge.
  - Action buttons: `"Back"` (returns to `/Medicines`), `"Home"` (returns to `/`).

---

### Journey 4: Daily Dose Tracking & Execution (`/`)

- **URL:** `https://medicare-w3b-app.vercel.app/`
- **UI Elements & Selectors:**
  - Date Filter Bar:
    - Today button: `button` with text `"Today"`
    - All Doses button: `button` with text `"All Doses"`
    - Pick Date: `button` with text `"Pick Date"`
    - 7 Horizontal Date Pills: Each displaying 3-letter weekday, day of month, and dose dot indicators.
  - Low Stock Alert Bar: Appears when any medicine has $< 4$ pills. (Contains text `"Low Stock Alert"` and `"Manage"` button).
  - Overdue Banner: Appears when uncompleted doses exist from prior days. (Contains `"View All Doses"` link).

#### Action 1: Mark Dose Done
1. Locate dose card for target medicine.
2. Select checkbox: `input[type="checkbox"][aria-label*="Select dose"]`.
3. Click `"Mark Done"` button (transitions to active cyan when checkbox is selected).
- **Assertions:**
  - Toast message: `"Dose marked as done!"`.
  - Dose card disappears from current view.
  - Physical inventory decrements by 1 pill.
  - If inventory reaches 0, medicine shows `"Paused"` status.
  - If last dose of schedule is completed, medicine is removed.

#### Action 2: Resolve Missed Dose
1. Click `"Missed"` button (amber calendar icon on dose card).
2. Modal opens: `MissedDoseModal` with title `"Missed Dose"`.
3. Select desired strategy:
   - **Option 1**: `"Continue with Next Dose"` (Missed dose moved to end of course).
   - **Option 2**: `"Carry Forward Missed Dose"` (Entire remaining schedule shifted forward by 1 day).
   - **Option 3**: `"Quantity unavailable"` (Active only when stock is 0).
4. Click `"Confirm Update"` button.
- **Assertions:**
  - Toast confirms schedule update.
  - Home dashboard schedule refreshes with adjusted dates.
  - Action logged in History audit trail.

---

### Journey 5: Pause and Resume Lifecycle

1. Navigate to `/Medicines`.
2. Locate target medicine card in sidebar list.
3. Click 3-dots menu icon: `button[aria-label="Medicine options"]`.
4. Dropdown menu opens:
   - **Edit** (`/UpdateMedicine/[id]`)
   - **Pause / Resume** toggle
   - **Delete** button
5. Click `"Pause"`:
   - Toast: `"Medicine schedule paused"`.
   - Card displays yellow `"Paused"` badge.
   - Corresponding dose cards on Home dashboard show disabled status `"Schedule is paused"`.
6. Click `"Resume"`:
   - Confirmation dialog opens: `"Resume medicine schedule?"`.
   - If quantity > 0: Click `"Resume"` button $\rightarrow$ Schedule shifts dates starting from today, toast: `"Medicine schedule resumed"`.
   - If quantity is 0: Dialog warns `"Warning: The schedule was automatically paused because its medicine quantity reached zero."` and `"Resume"` button is disabled (`"Add quantity first"`).

---

### Journey 6: Schedule Update & In-Progress Preservation (`/UpdateMedicine/[id]`)

1. From 3-dots menu on `/Medicines`, click `"Edit"`.
2. Page displays `"Edit Medicine Schedule"`.
3. If the course is already ongoing (some doses completed or start date in past):
   - Blue progress banner displays: `"Course In Progress: X / Y Days Completed"`.
   - Notification: `"Past completed doses are preserved and will not be regenerated."`
4. If start date is modified during an active course:
   - Modal prompts user how to apply start date change (Preserve completed doses vs shift future vs reset).
5. Click `"Update Schedule"`:
   - Toast: `"Your schedule updated successfully"` $\rightarrow$ Redirects to `/Medicines`.

---

### Journey 7: Calendar & Dose Audit History (`/History`)

- **URL:** `https://medicare-w3b-app.vercel.app/History`
- **UI Elements & Selectors:**
  - Metric Stat Badges:
    - Today's count (Cyan)
    - Upcoming count (Blue)
    - Previous History count (Purple, with breakdown of completed vs missed)
  - Month Navigator: `<` (Previous Month), `Today`, `>` (Next Month).
  - Calendar Grid: 7-column grid with numbered date cells.
    - Cells display color dots for doses: Completed (Emerald), Missed (Amber), Scheduled Today (Cyan), Upcoming (Blue), Past Due (Purple).
  - Tabs:
    - `Selected Day`: Doses on clicked calendar day.
    - `Today`: Today's scheduled doses.
    - `Upcoming`: Future scheduled doses.
    - `Previous`: Completed and missed dose audit log.
    - `All`: Complete dose sequence.
- **Assertions:**
  - In `Previous` tab: Completed doses display green badge `"Completed"` with exact completion time (`"Marked as Completed: HH:mm AM/PM, Month DD, YYYY"`).
  - Missed doses display amber badge `"Missed"` with strategy label (`"(Skipped & Added to End)"` or `"(Shifted Forward)"` or `"(Zero Quantity)"`).

---

### Journey 8: Caregiver Collaboration & Role-Based Access (`/Sharing`)

- **URL:** `https://medicare-w3b-app.vercel.app/Sharing`
- **UI Tabs:** `Invite`, `My Team`, `Inbox`.

#### Step 1: Send Invitation (Owner)
1. In `Invite` tab:
   - Invitee Email: `input#inviteEmail` (Must be another registered user).
   - Access Level Selection:
     - **Viewer (`readonly`)**: `"Can view schedules, history & calendar only"`
     - **Care Partner (`collaborator`)**: `"Can view + mark doses done & handle missed doses"`
     - **Co-Manager (`admin`)**: `"Full access: view, interact, edit & delete medicines"`
   - Click `"Send Invitation"`.
- **Assertions:**
  - Toast: `"Invitation sent to <email>!"`.
  - Invite appears under `"Sent Invitations"` with `"Pending"` badge.

#### Step 2: Accept Invitation (Caregiver)
1. Sign in as invitee user.
2. Navigate to `/Sharing` $\rightarrow$ Click `"Inbox"` tab.
3. Card shows invite from owner with requested role.
4. Click `"Accept"` button.
- **Assertions:**
  - Toast: `"Invitation accepted!"`.
  - Notification banner appears: `"Schedules You Have Access To"`.

#### Step 3: Switch View Context (`ViewAsSelector`)
1. On any page (`/`, `/Medicines`, `/History`), click the dropdown `ViewAsSelector` (Default shows `"My Schedule"`).
2. Select collaborator: `"<Owner Name>'s Schedule"` with role badge.
- **Context Distinction (Crucial for Automated QA):**
  - While on `"My Schedule"`, the user has full owner permissions for their own medicines (the `"Add Medicine"` button, creation form, and mark done controls are enabled for their own records).
  - When switched to `"<Owner Name>'s Schedule"`, collaborator role restrictions apply strictly to the owner's data.
- **Assertions on Shared Schedule (`<Owner Name>'s Schedule`):**
  - Active schedule updates in Redux.
  - Doses, medicine list, and calendar re-render displaying the owner's medications.
  - If role is **Viewer (`readonly`)**:
    - On `/`: Dose cards belonging to the owner display static badge `"View only — no interactions"` (checkboxes are disabled, `"Mark Done"` button is hidden).
    - On `/Medicines`: The medicine creation form is completely replaced by a static card: `"View Only Access — You can browse the medicine list and schedule but cannot add, edit or delete medicines."`
    - On `/Medicines`: The 3-dots actions menu on the owner's medicines is removed.
    - Date navigation (date pills, Today button) and personal device `"Medication alerts"` toggle remain enabled for browsing.
  - If role is **Care Partner (`collaborator`)**:
    - Can mark doses done and resolve missed doses on the owner's medications.
    - Cannot create, edit, or delete medicines for the owner.
  - If role is **Co-Manager (`admin`)**:
    - Full permissions: Can create medicines for owner (`_ownerId`), edit, pause/resume, delete medicines, and record doses.

#### Step 4: Role Modification & Revocation (Owner)
1. Sign back in as owner $\rightarrow$ `/Sharing` $\rightarrow$ `"My Team"` tab.
2. Change role dropdown: Switch from `Viewer` to `Care Partner` or `Co-Manager`.
   - Toast: `"<Name>'s access updated to <Role>"`.
3. Click `"Remove"` button:
   - Toast: `"<Name>'s access removed"`.
   - Collaborator access record deleted.

---

### Journey 9: Push Notification Alert Settings (`NotificationSettings`)

- **Location:** Component on Home Dashboard (`/`).
- **UI Elements:**
  - Toggle Switch: `button[role="switch"][aria-label="Toggle medication notifications"]`.
  - Status label: Displays `"Enabled"` or `"Disabled"`.
  - Test Button: `button` with text `"Test Notification"` (Visible when enabled).
- **Assertions:**
  - Clicking toggle requests browser `Notification.requestPermission()`.
  - When granted, registers Service Worker (`/sw.js`), registers subscription with `/api/notifications/subscription`, and toast confirms `"Medication notifications enabled."`.
  - Clicking `"Test Notification"` triggers `/api/notifications/test` $\rightarrow$ Toast `"Test notification sent to X device(s)."` $\rightarrow$ System/desktop notification displayed.

---

### Journey 10: Profile & Sign Out (`/User`)

- **URL:** `https://medicare-w3b-app.vercel.app/User`
- **UI Elements:**
  - User Name & Email display.
  - Authenticated badge: `"Authenticated User"`.
  - Button: `"Sign Out"` (Red).
- **Assertions:**
  - Clicking `"Sign Out"` clears Redux stores, terminates session cookie, and redirects browser to `/login`.

---

## 6. Live API Endpoint Contract Reference

All endpoints are hosted at `https://medicare-w3b-app.vercel.app/api/...`.

| Endpoint | Method | Required Auth | Parameters / Body | Status Codes |
|---|---|---|---|---|
| `/api/auth/signup` | POST | Public | Body: `{ name, email, password }` | `201`, `400`, `500` |
| `/api/auth/[...nextauth]` | POST | Public | Credentials: `{ email, password }` | `200`, `401` |
| `/api/medicareDB` | GET | Authenticated | Query: `ownerId?` | `200`, `401`, `403` |
| `/api/medicareDB` | POST | Authenticated | Body: `MedicinePayload` (`_ownerId?`) | `200`, `400`, `401`, `403` |
| `/api/medicareDB/[id]` | GET | Authenticated | Path: `id` (Medicine ID) | `200`, `401`, `404` |
| `/api/medicareDB/[id]` | PUT | Authenticated | Path: `id`, Body: `cleanBody` | `200`, `400`, `401`, `403`, `404` |
| `/api/medicareDB/[id]` | DELETE | Authenticated | Path: `id` (Medicine ID or Dose ID) | `200`, `401`, `403`, `404`, `409` |
| `/api/medicareDB/[id]/pause` | POST | Authenticated | Path: `id`, Body: `{ action, resumeDate? }` | `200`, `400`, `401`, `403`, `409` |
| `/api/medicareDB/missedDose` | POST | Authenticated | Body: `{ medicineId, doseId, action }` | `200`, `400`, `401`, `403`, `409` |
| `/api/medicareDB/history` | GET | Authenticated | Query: `ownerId?` | `200`, `401`, `403` |
| `/api/notifications/subscription` | GET | Optional | None | `200` |
| `/api/notifications/subscription` | POST | Authenticated | Body: `{ endpoint, keys, timezone }` | `200`, `400`, `401` |
| `/api/notifications/subscription` | DELETE| Authenticated | Body: `{ endpoint }` | `200`, `401` |
| `/api/notifications/cron` | POST | QStash Sign | Header: `upstash-signature`, Body: JSON | `200`, `400`, `401`, `404`, `502`|
| `/api/notifications/test` | POST | Authenticated | None | `200`, `401`, `404` |
| `/api/sharing` | GET | Authenticated | None | `200`, `401`, `500` |
| `/api/sharing/[accessId]` | PATCH | Authenticated (Owner) | Path: `accessId`, Body: `{ role }` | `200`, `400`, `401`, `403`, `404` |
| `/api/sharing/[accessId]` | DELETE| Authenticated (Owner) | Path: `accessId` | `200`, `401`, `403`, `404` |
| `/api/invitations` | GET | Authenticated | None (Lists pending received) | `200`, `401` |
| `/api/invitations` | POST | Authenticated | Body: `{ inviteeEmail, role }` | `201`, `400`, `401`, `404` |
| `/api/invitations/[id]` | PUT | Authenticated (Invitee) | Path: `id`, Body: `{ action: 'accept'\|'decline' }` | `200`, `400`, `401`, `403`, `404` |
| `/api/invitations/[id]` | DELETE| Authenticated (Owner) | Path: `id` | `200`, `401`, `403`, `404` |

---

## 7. TestPride Live Verification Test Suite

This automated test suite is tailored for TestPride / TestSprite executing against the live URL: `https://medicare-w3b-app.vercel.app`.

### Test Suite Summary

```
TEST SUITE MATRIX (Live URL: https://medicare-w3b-app.vercel.app)
├── [TS-01] Security & Auth Guards (6 tests)
├── [TS-02] Registration & Session Lifecycle (5 tests)
├── [TS-03] Medicine Schedule Creation (Daily, Alternate, Weekly) (6 tests)
├── [TS-04] Dose Execution & Physical Inventory Decrement (5 tests)
├── [TS-05] Missed Dose Resolution Strategies (4 tests)
├── [TS-06] Pause, Stockout & Date-Shifted Resume (4 tests)
├── [TS-07] Multi-User Caregiver Collaboration & Permissions (6 tests)
└── [TS-08] Calendar & Historical Audit Verification (4 tests)
Total: 40 Automated Test Cases
```

### [TS-01] Security & Route Protection
- **LIVE-SEC-01**: Access `https://medicare-w3b-app.vercel.app/` without cookies $\rightarrow$ HTTP 307 Redirect to `/login?callbackUrl=%2F`.
- **LIVE-SEC-02**: Access `/Medicines` unauthenticated $\rightarrow$ Redirect to `/login?callbackUrl=%2FMedicines`.
- **LIVE-SEC-03**: Access `/History` unauthenticated $\rightarrow$ Redirect to `/login?callbackUrl=%2FHistory`.
- **LIVE-SEC-04**: Access `/Sharing` unauthenticated $\rightarrow$ Redirect to `/login?callbackUrl=%2FSharing`.
- **LIVE-SEC-05**: Access `/User` unauthenticated $\rightarrow$ Redirect to `/login?callbackUrl=%2FUser`.
- **LIVE-SEC-06**: Authenticated user navigates to `/login` or `/signup` $\rightarrow$ Redirect to `/`.

### [TS-02] Registration & Session Lifecycle
- **LIVE-AUTH-01**: Register unique test user (`testuser_<timestamp>@example.com`, Password: `Password123!`, Name: `"QA Test Patient"`) $\rightarrow$ Toast `"User registered successfully."` $\rightarrow$ Land on `/login`.
- **LIVE-AUTH-02**: Attempt re-registration with same email $\rightarrow$ Error message `"An account with this email already exists."`.
- **LIVE-AUTH-03**: Attempt registration with 5-character password $\rightarrow$ Form validation error `"Password must be at least 6 characters long."`.
- **LIVE-AUTH-04**: Sign in with valid credentials $\rightarrow$ Redirect to `/` with session cookie set.
- **LIVE-AUTH-05**: Sign out via Header or `/User` $\rightarrow$ NextAuth cookie purged, land on `/login`.

### [TS-03] Schedule Generation Patterns
- **LIVE-MED-01 (Daily Single Dose)**:
  - Input: Name: `"Amoxicillin"`, Frequency: `1`, Dosage: `500`, Time: `09:00`, Quantity: `10`, Days: `10`, StartDate: Today.
  - Submit $\rightarrow$ Toast `"Schedule created!"` $\rightarrow$ Card appears in sidebar $\rightarrow$ Click `"See Schedule"` $\rightarrow$ Verify 10 rows with 500mg at 09:00.
- **LIVE-MED-02 (Daily Multi-Frequency & Variant Mapping)**:
  - Input: Name: `"Metformin"`, Frequency: `2`, Doses: `500, 1000`.
  - Map Slot 1 (08:00) $\rightarrow$ Dose 1 (500mg); Slot 2 (20:00) $\rightarrow$ Dose 2 (1000mg).
  - Submit $\rightarrow$ Verify schedule table contains alternating 500mg in AM and 1000mg in PM.
- **LIVE-MED-03 (Alternating Days Cycle)**:
  - Click `"Alternate"`. Name: `"Warfarin"`, Day 1: `2`, Day 2: `3`, Time: `18:00`, Qty: `20`, Days: `6`.
  - Submit $\rightarrow$ Verify table shows Day 1: 2mg, Day 2: 3mg, Day 3: 2mg, Day 4: 3mg, Day 5: 2mg, Day 6: 3mg.
- **LIVE-MED-04 (Specific Weekdays Pattern)**:
  - Click `"Weekdays"`. Name: `"Methotrexate"`, Default: `0`, Custom Override: `15`, Days: `Monday`, Days Course: `14`.
  - Submit $\rightarrow$ Verify 15mg doses only appear on Mondays, 0mg on other days.
- **LIVE-MED-05 (Variant-Separated Quantities)**:
  - Create medicine with doses `2mg, 5mg`. Check `"Separate quantity for each dosage packet"`. Enter `10` for 2mg and `15` for 5mg.
  - Submit $\rightarrow$ Table info box displays `"2mg: 10 pills, 5mg: 15 pills"`.
- **LIVE-MED-06 (Client Validation)**:
  - Leave medicine name empty and submit $\rightarrow$ Red validation error `"please enter Medicine Name"`.

### [TS-04] Dose Execution & Inventory Consumption
- **LIVE-DOSE-01**: Select checkbox on a scheduled dose card on Home page $\rightarrow$ Button `"Mark Done"` turns cyan. Click `"Mark Done"`.
- **LIVE-DOSE-02**: Verify toast `"Dose marked as done!"` and dose card disappears from today's schedule view.
- **LIVE-DOSE-03**: Inspect `/Medicines` $\rightarrow$ Verify quantity decreased by exactly 1 pill.
- **LIVE-DOSE-04**: Mark done on variant medicine $\rightarrow$ Verify only the specific dosage variant inventory decrements.
- **LIVE-DOSE-05**: Mark done on medicine with quantity = 1 $\rightarrow$ Quantity reaches 0 $\rightarrow$ Card updates to `"Paused"` and alert banner displays `< 4 pills`.

### [TS-05] Missed Dose Resolution
- **LIVE-MISS-01 (Skip and Continue)**:
  - Click `"Missed"` on a dose $\rightarrow$ Choose `"Continue with Next Dose"` $\rightarrow$ Click `"Confirm Update"`.
  - Assertion: Dose removed from today; schedule length extends by 1 day; total remaining pills unchanged.
- **LIVE-MISS-02 (Carry Forward Shift)**:
  - Click `"Missed"` on a dose $\rightarrow$ Choose `"Carry Forward Missed Dose"` $\rightarrow$ Click `"Confirm Update"`.
  - Assertion: Today's dose deferred to tomorrow; all remaining dates pushed forward by +1 day.
- **LIVE-MISS-03 (Quantity Unavailable)**:
  - Attempt dose with zero quantity $\rightarrow$ Modal displays `"Quantity unavailable"` option.
  - Assertion: Dose logged as missed without deducting inventory.
- **LIVE-MISS-04 (Audit Trail)**:
  - Navigate to `/History` $\rightarrow$ `"Previous"` tab $\rightarrow$ Verify missed dose appears with Amber badge and exact timestamp.

### [TS-06] Pause & Resume Lifecycle
- **LIVE-PAUSE-01**: In `/Medicines`, click 3-dots menu $\rightarrow$ Click `"Pause"`.
  - Assertion: Badge changes to `"Paused"`. On Home dashboard, dose card checkbox is disabled with text `"Schedule is paused"`.
- **LIVE-PAUSE-02**: In `/Medicines`, click 3-dots menu $\rightarrow$ Click `"Resume"`.
  - Assertion: Confirmation modal opens. Click `"Resume"`. Badge updates to active.
- **LIVE-PAUSE-03 (Resume Date Shift)**:
  - Pause a schedule for 3 days. When resuming, select today's date.
  - Assertion: All future scheduled doses shift forward to resume seamlessly from today.
- **LIVE-PAUSE-04 (Zero Stock Guard)**:
  - Attempt to resume a medicine whose quantity is 0.
  - Assertion: Resume button is disabled (`"Add quantity first"`).

### [TS-07] Multi-User Caregiver Collaboration
- **LIVE-SHARE-01**: User A (Owner) invites User B (Caregiver) with role `readonly` (Viewer).
  - Assertion: Invite saved as `pending` under `"Sent Invitations"`.
- **LIVE-SHARE-02**: User B logs in $\rightarrow$ Navigates to `/Sharing` $\rightarrow$ `"Inbox"` $\rightarrow$ Clicks `"Accept"`.
  - Assertion: User B now has active collaboration access to User A's schedule.
- **LIVE-SHARE-03 (Viewer Restrictions - Scoped Context Verification)**:
  - **Context Precondition**: When User B is in `"My Schedule"`, User B is the full owner of their own account. The `"Add Medicine"` button, date navigation, and personal notification settings are INTENTIONALLY enabled for User B's own records. TestPride must NOT assert read-only restrictions on `"My Schedule"`.
  - **Execution**:
    1. User B clicks the `ViewAsSelector` dropdown (labeled `"My Schedule"`) at the top of the Home or Medicines page.
    2. User B selects `"<User A>'s Schedule"` with the `"Viewer"` badge.
  - **Assertions on Shared Schedule (`<User A>'s Schedule`)**:
    1. On Home dashboard (`/`): Scheduled dose cards from User A display `"View only — no interactions"`. Dose selection checkboxes are disabled; `"Mark Done"` is absent.
    2. On `/Medicines`: The schedule generator form is NOT rendered. In its place, a static card displays: `"View Only Access — You can browse the medicine list and schedule but cannot add, edit or delete medicines."`
    3. On `/Medicines`: 3-dots menu on User A's medicines is hidden (User B cannot edit, pause, or delete User A's medicines).
    4. Date navigation controls (date pills, Today button) and the local device `"Medication alerts"` toggle remain functional for browsing and client alert reception.
  - **Verification of Own Account Independence**:
    1. User B clicks `ViewAsSelector` and switches back to `"My Schedule"`.
    2. Verify User B returns to their own account context where the `"Add Medicine"` button and full creation controls are active.
- **LIVE-SHARE-04 (Care Partner Interaction)**:
  - User A upgrades User B's role to `collaborator` (Care Partner) via `/Sharing` $\rightarrow$ `"My Team"`.
  - User B refreshes $\rightarrow$ User B can now select dose checkboxes, click `"Mark Done"`, and resolve missed doses.
  - User B still cannot create, edit, or delete medicines.
- **LIVE-SHARE-05 (Co-Manager Full Access)**:
  - User A upgrades User B's role to `admin` (Co-Manager).
  - User B can create new medicines for User A, edit schedules, and pause/resume.
- **LIVE-SHARE-06 (Revoke Access)**:
  - User A clicks `"Remove"` on User B in `"My Team"`.
  - Assertion: User B is immediately removed; User B can no longer view User A's schedule.

### [TS-08] Calendar & History Verification
- **LIVE-CAL-01**: Navigate to `/History` $\rightarrow$ Full month grid renders current month and year.
- **LIVE-CAL-02**: Date cells with doses display colored dots corresponding to completed, missed, today, and upcoming.
- **LIVE-CAL-03**: Click any date cell with doses $\rightarrow$ Right-hand pane filters and displays `"Doses for <Selected Date>"`.
- **LIVE-CAL-04**: Click `"Previous"` tab $\rightarrow$ Displays chronological list of completed and missed doses with action performer and timestamp.

---

## 8. Live Testing Checklist for TestPride Execution

When launching automated test runs in TestPride against `https://medicare-w3b-app.vercel.app`:

1. **Target Base URL:** Set test target to `https://medicare-w3b-app.vercel.app`.
2. **Pre-Configured Authentication:** TestPride can immediately authenticate on the live site using the pre-configured demo account:
   - **Email:** `demo@mail.com`
   - **Password:** `cbc456`
   (Or dynamically provision a fresh account via `/signup` using `LIVE-AUTH-01`).
3. **Multi-User Collaboration Suite:** Provision two distinct test accounts (`demo@mail.com` and a secondary account e.g. `caregiver_test@...`) to execute Journey 8 (Caregiver Collaboration).
4. **Browser Permissions:** In TestPride's browser profile, set `notifications: "granted"` to allow the `NotificationSettings` component to register push subscriptions without blocking.
5. **DOM Locators:** Use the exact IDs (`#medicine_name`, `#frequency`, `#quantity`, `#number_days`, `#startdate`, `#inviteEmail`) and text matching specified in Section 5.
6. **Scoped Permissions & Dual-Context Validation (Crucial):**
   - **Do NOT assert that the `"Add Medicine"` button or date navigation is disabled on `"My Schedule"`.** Every registered user is the owner of their own account and can add their own medicines.
   - Read-only collaborator restrictions apply **EXCLUSIVELY** when viewing a shared schedule. Always use the `ViewAsSelector` dropdown to switch to `"<Owner Name>'s Schedule"` before asserting read-only restrictions (where dose cards display `"View only — no interactions"` and `/Medicines` displays `"View Only Access"`).
   - Date/day navigation controls and personal browser `"Medication alerts"` toggles are browsing and client-device tools that remain intentionally active in all view modes.

---

**Document Version:** 2.1 (Live Deployment & TestPride Specification)  
**Live Target URL:** [https://medicare-w3b-app.vercel.app](https://medicare-w3b-app.vercel.app)  
**Last Updated:** 2026-09-16  
**Repository:** [AARYA77-dev/medicare](https://github.com/AARYA77-dev/medicare)
