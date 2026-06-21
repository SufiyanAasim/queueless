# Changelog

All notable changes to the QueueLess project will be documented in this file.

---

## QueueLess v1.3.5 — Pulse (Latest)

Codename **Pulse**. This release turns QueueLess into a proactive, self-managing queue system. Admins gain granular service-level control, staff actions are tracked and attributed, customers receive early push alerts, and the queue can now reset itself overnight — all without manual intervention.

### 🔔 Proactive customer notifications

- Push notification at **position 2** — "You're almost up, head to the counter soon"
- Push notification at **position 1** — "You're next, make your way now"
- Triggered via the Web Push API on the customer's `/token/:id` page; works in background tabs
- Notifications fire only when the queue position actually crosses the threshold (position change detection via `prevPositionRef`)

### ♻️ Token re-queue

- Expired tokens can be re-queued within a **2-hour window** from issuance
- Re-queue preserves the original `service`, `priority`, and `groupSize`
- New token issued with a fresh number; customer is redirected to the new token page
- Backend: `POST /tokens/:id/requeue` with Joi UUID validation

### 👨‍👩‍👧 Group / family tokens

- Customers can select a **group size of 1–5** when taking a token
- Group badge displayed on the customer's token page and in the admin waiting list
- Hidden for the Medical/Hospital industry profile (individual patient flow)
- `groupSize` stored on the token record and logged to analytics

### ⏸ Per-service pause

- Admins can **pause and resume individual service queues** independently of the global pause
- Paused service column shows a `PAUSED` badge; "Call Next" is blocked for that service
- Customers on `/take` see paused services as dimmed cards and are automatically redirected to the first available service
- Priority tokens always bypass per-service pause

### 🚨 SLA wait alert

- Admin dashboard shows a **red alert bar** when any service exceeds the configured SLA wait target (minutes)
- SLA threshold is set in Settings → Queue Behaviour
- Calculated client-side from `cfg.slaMinutes` and live waiting-token `estimatedWaitSeconds`

### 📊 Staff performance metrics

- New **Staff Performance table** in Admin Analytics — tokens served, average service time, tokens called per staff member
- Attributed from `staff_username` stored on every `token_called` / `token_served` analytics event
- Backend: `GET /admin/analytics/staff` — MongoDB aggregation grouped by `staff_username`
- Both admin dashboard calls and staff portal calls now carry the authenticated username

### 🗓 Scheduled auto-reset

- Admins can set a **daily auto-reset time** (HH:MM) in Settings → Queue Behaviour
- A `setInterval` scheduler (Asia/Karachi timezone via `Intl.DateTimeFormat`) checks once per minute and triggers `resetQueue()` when the time matches
- A `lastAutoResetDate` flag prevents double-resets within the same day
- Backend: `scheduler.service.js`

### 👥 Multiple admin accounts

- Admins can **create and delete secondary admin accounts** at `/admin/manage`
- Maximum of 10 accounts; duplicate usernames rejected; passwords bcrypt-hashed (`BCRYPT_ROUNDS = 10`)
- Admins cannot delete their own account (blocked on both frontend and backend)
- "You" badge shown next to the currently signed-in admin in the accounts list
- Backend: `GET/POST/DELETE /admin/admins`

### 📺 Display board customisation

- Admins can set a **permanent welcome message** shown as a banner on the display board (`/display`)
- Configured in Settings → Display Board
- Stored in Firebase config as `displayMessage`; cleared by saving an empty string

### 🤝 Appointment → walk-in merge

- Confirmed appointments are automatically **converted to priority tokens** within a ±5-minute window of their scheduled time
- A `setInterval` service checks every minute for unmerged confirmed appointments
- Prevents double-issue by writing the new `tokenId` back to the appointment record
- Logs an `appointment_merged` analytics event
- Backend: `appointmentMerge.service.js`

### 🛠 Analytics — all historical tokens

- Analytics (`GET /admin/analytics`) now cross-references **Firebase RTDB** for token counts
- Every token ever issued (including any issued before event-logging was set up) is reflected in `totalIssued`, `totalExpired`, peak-hour distribution, and service distribution
- Wait-time stats (`avgWaitSeconds`) still come from the event log where they are recorded
- CSV parser refactored to use column-name-to-index map from the header row (no more hardcoded positional indices)

### 🐛 Bug fixes

- Staff portal `callNextToken()` was never passing `staffUsername` — all staff actions showed `null` in analytics; fixed by passing `req.user.sub`
- Admin dashboard `apiCallNext` / `apiCallNextPriority` calls were missing `staffUsername`; fixed by passing `user.sub` from the frontend
- `position` constant in `MyToken.jsx` was referenced in a `useEffect` dep array before being declared (Temporal Dead Zone); fixed by hoisting the calculation above all `useEffect` hooks

---

## QueueLess v1.3.0 — Crew

Codename **Crew**. The biggest release yet — full account management for admins and staff, a smarter queue engine, eight new platform features, and a zero-vulnerability dependency baseline.

### 👤 Admin & staff account management

- Admin profile page — edit display name, view username and role
- Admin change-password flow with current-password verification
- Staff profile page — edit display name, view assigned service
- Staff change-password flow
- **ADMIN ▼** dropdown in the navigation header — theme toggle (light/dark pill switch), My profile, Change password, Sign out
- Staff dropdown — My queue, My profile, Change password
- Organisation name and industry type shown next to the logo and in the footer status bar

### 🚦 Priority queue engine

- Priority tokens displayed in a dedicated amber section above all regular service columns
- When any priority token is waiting, all regular service queues are visually paused and "Call Next" is blocked — enforced on both frontend and backend
- `POST /admin/queue/call-next-priority` — calls the earliest priority token across **all** services regardless of which counter
- `callNextToken()` returns `409 PRIORITY_BLOCKING` if a regular token would be called while priority tokens are pending
- Priority tokens bypass the queue-paused gate — they can always be issued even when the general queue is suspended

### 🌟 Eight new features

| Feature | Where | Description |
|---------|-------|-------------|
| **Display board** | `/display` | Now shows a priority section, flash animation on token change, notes on called tokens, and an announcement banner |
| **Live announcements** | Admin Dashboard | Broadcast a message instantly to Home, Take-a-Token, Staff dashboard, and display board via Firebase real-time |
| **Staff dashboard upgrade** | Staff Dashboard | Announcement banner, priority-at-other-counters alert, skip/no-show for called token, inline note editor per token |
| **Wait preview** | `/take` | Each service card shows live waiting count + estimated wait time before customer commits |
| **Token lookup** | Admin Dashboard | Search panel to find any token by number, ID, or note; inline note editor in results |
| **Analytics charts** | Admin Report | Hourly volume bar chart (SVG, no external library) added alongside the existing heatmap |
| **Token notes** | Staff & Admin | Attach short notes to any token; appears in waiting lists, dashboards, and display board |
| **Appointment booking** | `/book` & `/admin/appointments` | Customers book slots; Admin views, confirms, or cancels bookings |

### 🔒 Security

- `firebase-admin` upgraded 12 → 14 resolving the transitive chain of vulnerable `gaxios` / `google-gax` / `teeny-request` packages
- `overrides.uuid = ^11.1.1` — patches GHSA-w5hq-g745-h8pq (missing buffer bounds check in uuid v3/v5/v6 when `buf` is provided)
- `overrides.js-yaml = ^4.1.0` — patches quadratic-complexity DoS via repeated YAML merge-key aliases
- **`npm audit` reports 0 vulnerabilities** (was 8 moderate)

### 🐛 Bug fixes

- Dark mode: `.bg-ink` elements (buttons, selected cards, table headers) now show correct text colour in dark mode via global CSS override
- Settings page (`/admin/setup`) no longer accessible without login — auth guard added
- `401` interceptor scoped to protected routes only — cold-start Render errors no longer wipe auth tokens and redirect to login
- React Rules of Hooks violations in `AdminProfile` and `StaffProfile` fixed (auth guard moved after all hook calls)
- CSV export on Analytics page now sends `Authorization: Bearer` header via `fetch()` + blob download
- `loading` reference error in `Home.jsx` fixed by destructuring from `useQueueState`

---

## QueueLess v1.2.2 — Vision

Codename **Vision**. A focused patch release hardening the analytics pipeline, fixing UI regressions, and improving admin tooling.

### 🛠 Fixes & improvements

**Analytics**
- Detailed report page (`/admin/report`) with AI-generated action plan and staffing recommendation
- Dual-write analytics to MongoDB + local CSV for redundancy
- Auto-refresh analytics data every 30 seconds with manual refresh button
- Dynamic heatmap — hours now computed from real data instead of hardcoded range
- Per-service intensity calculation corrected for accurate colour scaling
- Hardcoded chart labels replaced with dynamic service names

**Admin navigation**
- Global admin navigation bar with links to Dashboard, Analytics, Report, and Settings
- "Generate Report" removed from navbar; moved to a dashboard button for cleaner UX

**UI**
- Hero section layout fixed for 100% browser zoom
- Live status card centred in its column
- Footer logo visibility corrected; hero lockup enlarged
- Logo assets updated with final versions

**Stability**
- MongoDB fallback for analytics when primary write fails (non-fatal)
- Firebase mock refs in tests updated to match multi-path atomic update schema
- Vite peer dependency conflict resolved for clean Vercel builds
- High-severity npm vulnerability patched

---

## QueueLess v1.2.0 — Scope

Codename **Scope**. The first stable release of QueueLess — a cloud-native, token-based queue management system built for real organisations.

### ✨ What's included

**Core queue system**
- Walk-in token issuance with email notification and tracking link
- Real-time queue state via Firebase Realtime Database — no refresh needed
- Priority token support — flagged tokens served before regular queue
- Token expiry, skip / no-show marking
- Customer-facing token tracking page (`/token/:id`) with live position, ETA, QR code, WhatsApp share, and browser push notifications
- Confetti + sound alert when your token is called

**Admin panel**
- Secure JWT-based admin login
- Queue control dashboard — pause, resume, reset, call next, skip tokens
- Multi-service queue support — each service counter managed independently
- AI Auto Mode — ML-predicted call intervals from historical traffic data
- Analytics dashboard with per-hour and per-service traffic heatmap
- Staff management — create, list, and remove staff accounts

**Staff portal**
- Staff login (username/password or PIN)
- Per-counter queue view with call-next and no-show controls
- Staff presence indicator (online/offline) visible to admin

**Public display**
- `/display` — full-screen TV-ready board showing now-serving tokens per service, live clock, and queue counts

**Infrastructure**
- React 18 + Vite frontend deployed on Vercel
- Node.js + Express backend deployed on Render
- Firebase Realtime Database (Singapore region)
- MongoDB Atlas for analytics persistence
- GitHub Actions CI/CD pipeline
- Firebase Analytics integration

---
*QueueLess is a cloud-native queue management system. No app installation required — customers use any browser.*
