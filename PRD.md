# Medicare — Product Requirements Document (PRD)

## What this is

Medicare is a Next.js medication management application for tracking medicines, dosages, and schedules with push notifications. It enables users to create and maintain medicine records, view upcoming doses, mark medications as taken or missed, and share medicines with caregivers (family members, nurses, or healthcare providers). The system includes timezone-aware push notifications powered by Upstash QStash and Web Push API.

---

## Stack

- **Language(s):** TypeScript (96.5%), CSS (3.1%), JavaScript (0.4%)
- **Framework / runtime:** Next.js 16.3 (App Router) with React 19, Tailwind CSS 4.1, and Turbopack
- **Notable libraries:** 
  - Redux Toolkit (state management)
  - NextAuth 4.24 (authentication)
  - Mongoose 8.24 (MongoDB ODM)
  - Upstash QStash (delayed scheduling)
  - Web Push (push notifications)
  - Axios (HTTP client)
  - Formik + Yup (form validation)

---

## How it's organized

```
app/
  login/                           Authentication entry point
  signup/                          User registration
  Home/                            Main dashboard with medicine overview
  Medicines/                       Medicine CRUD operations and management
  UpdateMedicine/                  Edit existing medicine records
  History/                         Past medication dose history
  Caring/                          Caregiver management interface
  Sharing/                         Share medicines with other users
  User/                            User profile and settings
  testpage/                        Testing page
  api/
    auth/                          NextAuth configuration and handlers
    medicareDB/                    Medicine CRUD API endpoints
    notifications/                 Push notification handlers (cron, send, subscribe)
    sharing/                       Medicine sharing API endpoints
    invitations/                   Caregiver invitation endpoints
  layout.tsx                       Root layout with providers
  page.tsx                         Home page entry point
  globals.css                      Global Tailwind styles
  loading.tsx                      Loading skeleton
  not-found.tsx                    404 page

components/
  header.tsx                       Navigation header
  AuthProvider.tsx                 NextAuth session wrapper
  StoreProvider.tsx                Redux store wrapper
  ToasterProvider.tsx              React Hot Toast notifications
  ViewAsSelector.tsx               Toggle between user/caregiver views
  MissedDoseModal.tsx              UI for marking doses as missed
  NotificationSettings.tsx         Enable/disable push notifications

store/                             Redux state management
  store.ts                         Redux store configuration
  medicineSlice.ts                 Medicine state, actions, and reducers
  sharingSlice.ts                  Sharing state and actions
  hooks.ts                         Typed useDispatch/useSelector hooks

lib/
  dbConnect.ts                     MongoDB connection manager
  notificationScheduling.ts        QStash scheduling and message creation
  push.ts                          Web Push API helpers

Schemas/                           Mongoose models and database schemas
Interfaces/                        TypeScript types and interfaces

middleware.ts                      Auth routing guard (NextAuth)
tsconfig.json                      TypeScript configuration
next.config.ts                     Next.js configuration
```

### How it fits together

The app authenticates users via NextAuth, loads their medicine list from MongoDB through the API layer, and stores it in Redux. The Home page displays upcoming doses for the logged-in user (or a selected caregiver's medicines if in caregiver mode).

Creating or editing a medicine triggers:
1. API call to `/api/medicareDB` to store in MongoDB
2. `notificationScheduling.ts` creates QStash messages for the next 7 days
3. QStash wakes the `/api/notifications/send` endpoint at scheduled times
4. The endpoint checks the user's timezone and sends Web Push notifications via `/api/notifications/subscribe`

Caregivers are invited via `/api/invitations`, and access is managed through the Sharing interface. Users can also view their medication history in the History page and mark missed doses via MissedDoseModal.

---

## How to run it

### Prerequisites

- **Node.js:** 18.x or later (recommended 20+)
- **Package Manager:** npm (bundled with Node), pnpm, or yarn
- **Database:** MongoDB instance (local or Atlas)
- **Authentication:** NextAuth configured with providers
- **Notifications:** 
  - VAPID keys for Web Push
  - Upstash QStash account for scheduled notifications
- **Deployment:** Vercel (recommended) or any Node.js hosting

### Quick start (local development)

```bash
# 1. Clone the repository
git clone https://github.com/AARYA77-dev/medicare.git
cd medicare

# 2. Install dependencies
npm install

# 3. Create .env.local file
# Copy or create .env.local with the following variables:
cat > .env.local << 'EOF'
# Database
MONGODB_URI=mongodb://localhost:27017/medicare
# or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/medicare

# NextAuth
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# NextAuth Providers (example: GitHub, Google, etc.)
# GITHUB_ID=your-github-id
# GITHUB_SECRET=your-github-secret

# Web Push Notifications
VAPID_SUBJECT=mailto:your-email@example.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-public-vapid-key
VAPID_PRIVATE_KEY=your-private-vapid-key

# QStash Configuration (Upstash)
QSTASH_CURRENT_SIGNING_KEY=your-qstash-current-key
QSTASH_NEXT_SIGNING_KEY=your-qstash-next-key
QSTASH_TOKEN=your-qstash-token
QSTASH_URL=https://qstash.upstash.io

# Application
APP_URL=http://localhost:3000
EOF

# 4. Generate VAPID keys (if not already generated)
# npx web-push generate-vapid-keys

# 5. Run the development server
npm run dev

# Open http://localhost:3000 in your browser
```

### Available scripts

```bash
# Development
npm run dev
# Starts dev server with Turbopack on http://localhost:3000

# Production
npm run build      # Build for production
npm start          # Start production server (requires build first)

# Code quality
npm run lint       # Run ESLint on all files
```

### Environment Variables Reference

| Variable | Type | Description | Required |
|----------|------|-------------|----------|
| `MONGODB_URI` | string | MongoDB connection string | ✓ |
| `NEXTAUTH_SECRET` | string | Secret key for NextAuth JWT | ✓ |
| `NEXTAUTH_URL` | string | Base URL for NextAuth (http://localhost:3000 locally) | ✓ |
| `VAPID_SUBJECT` | string | Email for VAPID key generation | ✓ |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | string | Public VAPID key (exposed to client) | ✓ |
| `VAPID_PRIVATE_KEY` | string | Private VAPID key (server only) | ✓ |
| `QSTASH_TOKEN` | string | Upstash QStash API token | ✓ |
| `QSTASH_URL` | string | QStash endpoint URL | ✓ |
| `QSTASH_CURRENT_SIGNING_KEY` | string | Current signing key for QStash verification | ✓ |
| `QSTASH_NEXT_SIGNING_KEY` | string | Next signing key for QStash rotation | ✓ |
| `APP_URL` | string | Production app URL (used in notifications) | ✓ |

### Push Notifications Setup

To enable push notifications in production:

```bash
# 1. Generate VAPID keys (if not done)
npx web-push generate-vapid-keys

# 2. Add the keys to your .env.local and deploy to Vercel

# 3. In the Vercel dashboard:
# - Add all QSTASH_* and VAPID_* variables
# - Add MONGODB_URI and NEXTAUTH_SECRET

# 4. Deploy
git push origin main

# 5. Users enable notifications
# - Users visit Medicare and click "Enable medication notifications" on Home
# - Browser prompts for push permission
# - System automatically schedules QStash messages when creating/updating medicines
```

**Note:** QStash creates one delayed message per dose in the next 7 days per subscription. A refresh message is sent after 6 days to reschedule doses beyond the 7-day limit.

---

## Feature Overview

### Core Features

#### 1. Medicine Management
- **Create medicines** with name, dosage, frequency, and notes
- **Edit medicines** to update details and schedules
- **Delete medicines** to remove from list
- **View all medicines** in organized list on Medicines page

**Files:** `app/Medicines/`, `app/UpdateMedicine/`, `app/api/medicareDB/`, `store/medicineSlice.ts`

#### 2. Medication Tracking
- **Dashboard (Home)** displays upcoming doses
- **History page** shows past dose records
- **Mark doses as taken** or **missed** via MissedDoseModal
- **Visual status indicators** for dose completion

**Files:** `app/Home/`, `app/History/`, `components/MissedDoseModal.tsx`

#### 3. Push Notifications
- **Web Push API** integration for browser notifications
- **QStash scheduling** for reliable delayed messages
- **Timezone-aware delivery** respects user timezone
- **Settings toggle** to enable/disable notifications per browser

**Files:** `lib/notificationScheduling.ts`, `lib/push.ts`, `app/api/notifications/`, `components/NotificationSettings.tsx`

#### 4. Caregiver Management
- **Share medicines** with caregivers (family, nurses, doctors)
- **View as caregiver** - switch context to see shared medicines
- **Invitation system** to add caregivers
- **Access control** - caregivers see only shared medicines

**Files:** `app/Caring/`, `app/Sharing/`, `app/api/sharing/`, `app/api/invitations/`, `components/ViewAsSelector.tsx`, `store/sharingSlice.ts`

#### 5. Authentication
- **NextAuth integration** with multiple provider support
- **Secure login/signup** pages
- **Session management** with JWT
- **Route protection** via middleware

**Files:** `app/login/`, `app/signup/`, `app/api/auth/`, `middleware.ts`, `components/AuthProvider.tsx`

---

## Architecture Patterns

### State Management (Redux)
- **medicineSlice.ts** – Stores list of medicines, loading states, errors
- **sharingSlice.ts** – Stores shared medicines, caregiver invitations
- **hooks.ts** – Custom hooks for type-safe dispatch and selector usage

### API Routes
- **RESTful endpoints** for CRUD operations
- **Request validation** with Yup schemas
- **Error handling** with consistent response format
- **Authentication checks** on protected routes

### Database (MongoDB + Mongoose)
- **Models in Schemas/** directory
- **Connection pooling** via `lib/dbConnect.ts`
- **ODM features** – validation, middleware, indexing

### UI Components
- **Reusable** components in `components/`
- **Providers** wrap app for context (Auth, Redux, Toast)
- **Responsive design** with Tailwind CSS
- **Toast notifications** via React Hot Toast

---

## Testing Guide for TestPride

### Test Areas

#### Medicine CRUD
- ✓ Create medicine with valid inputs
- ✓ Edit medicine and verify updates
- ✓ Delete medicine and confirm removal
- ✓ Validation errors on missing fields
- ✓ Duplicate medicine handling

**Test Files:** `app/api/medicareDB/`, `app/Medicines/`, `store/medicineSlice.ts`

#### Authentication & Authorization
- ✓ Login with valid credentials
- ✓ Signup creates new user
- ✓ Middleware redirects unauthenticated users to login
- ✓ Protected routes blocked without auth
- ✓ Session persistence across page reloads

**Test Files:** `middleware.ts`, `app/api/auth/`, `components/AuthProvider.tsx`

#### Notifications
- ✓ QStash messages created on medicine creation
- ✓ Timezone respected in notification time
- ✓ Users can enable/disable notifications
- ✓ Refresh job reschedules doses after 6 days
- ✓ Notification sent at correct time via Web Push

**Test Files:** `lib/notificationScheduling.ts`, `app/api/notifications/`

#### Caregiver Sharing
- ✓ Invite caregiver via email
- ✓ Caregiver accepts invitation
- ✓ Caregiver sees shared medicines
- ✓ ViewAsSelector toggles context
- ✓ Caregiver cannot edit user's medicines
- ✓ Remove caregiver access

**Test Files:** `app/api/invitations/`, `app/api/sharing/`, `store/sharingSlice.ts`

#### History & Tracking
- ✓ Doses marked as taken recorded
- ✓ Missed doses logged
- ✓ History page displays past doses
- ✓ Filter history by date range
- ✓ Export history (if implemented)

**Test Files:** `app/History/`, `components/MissedDoseModal.tsx`

---

## Deployment

### Vercel (Recommended)

```bash
# 1. Push code to GitHub
git push origin main

# 2. Connect repository to Vercel
# - Visit https://vercel.com
# - Import project from GitHub
# - Select AARYA77-dev/medicare

# 3. Add environment variables in Vercel dashboard
# - All variables from .env.local (see Prerequisites section)

# 4. Deploy
# - Vercel auto-detects Next.js and deploys
# - Custom domain optional

# 5. Enable notifications
# - QStash will POST to your Vercel domain
# - Users enable notifications in app
```

### Self-Hosted (Node.js)

```bash
# Build
npm run build

# Run
node_modules/.bin/next start

# With process manager (PM2)
pm2 start "npm start" --name medicare
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `app/Home/page.tsx` | Main dashboard |
| `app/Medicines/page.tsx` | Medicine list and CRUD |
| `app/History/page.tsx` | Dose history view |
| `app/Caring/page.tsx` | Caregiver management |
| `app/api/medicareDB/` | Medicine database API |
| `app/api/notifications/` | Push notification handlers |
| `app/api/sharing/` | Sharing & access control API |
| `app/api/invitations/` | Caregiver invitation API |
| `lib/notificationScheduling.ts` | QStash message scheduling logic |
| `store/medicineSlice.ts` | Redux medicine state |
| `components/ViewAsSelector.tsx` | User/caregiver context toggle |
| `middleware.ts` | Auth routing protection |

---

## Try asking

- How does the caregiver view (ViewAsSelector) switch between user and caregiver contexts, and what Redux state changes occur?
- What happens when QStash triggers `/api/notifications/send` and how does it determine the user's timezone to send notifications at the correct time?
- How are doses tracked as "missed" in the MissedDoseModal, and what's the flow from UI interaction to database persistence?
- What validation is performed when creating/updating medicines, and where are the Yup schemas defined?
- How does the invitation system work for adding caregivers, and what access permissions do caregivers have?

---

## Live Demo

**Homepage:** [https://medicare-w3b-app.vercel.app](https://medicare-w3b-app.vercel.app)

---

## Contributing

Contributions are welcome! Please:

1. Open an issue to discuss big changes or features
2. Fork the repository and create a branch for your feature/fix
3. Send a pull request with a clear description and testing steps
4. Run linters before submitting: `npm run lint`

---

## License

See `LICENSE` file in the repository for details.

---

**Document Version:** 1.0  
**Last Updated:** 2026-08-31  
**Repository:** [AARYA77-dev/medicare](https://github.com/AARYA77-dev/medicare)
