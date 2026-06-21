# Changelog

All notable changes to the QueueLess project will be documented in this file.

---

## QueueLess v1.3.0 — Crew 🧑‍💼 (Latest)

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

## QueueLess v1.2.2 — Analytics & Stability

A focused patch release hardening the analytics pipeline, fixing UI regressions, and improving admin tooling.

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

## QueueLess v1.2.0 — Initial Public Release

The first stable release of QueueLess — a cloud-native, token-based queue management system built for real organisations.

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
