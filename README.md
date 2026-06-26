# QueueLess — Smart Queue Token Management System

**Live:** [queueless-beta.vercel.app](https://queueless-beta.vercel.app)  
**Author:** Muhammad Sufiyan Aasim · [@msufiyanpk](https://github.com/msufiyanpk)  
**Latest release:** v1.4.5 — Intelligent Collaboration

QueueLess is a full-stack, cloud-native digital queue management system that replaces paper tokens with a real-time browser experience. Customers take tokens from any device, track their live position, and get notified the moment their number is called — no app download required.

Admins and staff manage the queue from a dedicated portal with a live dashboard, ML-assisted auto mode, granular analytics, and per-service staff portals. Every queue event is dual-written to MongoDB Atlas and a CSV event log, feeding a data mining pipeline that performs wait-time predictions, peak-hour heatmaps, and staffing recommendations.

**v1.4.x turns QueueLess into an intelligent operational workspace:** admin-defined custom queues, cross-counter token referral, a grounded AI assistant (RAG, never fabricates data), internal team messaging (1:1 + group chat), a notification center, secure sharing with QR codes, shared files, and role-based access control — all on the free Firebase Spark plan (no Cloud Storage / Blaze required).

---

## Features

### Customer-facing
- **Take a token** — pick a service, request priority if needed (elderly, medical, VIP), and get a token number instantly
- **Group / family token** — select a group size (1–5) when taking a token; hidden for medical industry
- **Wait preview** — see live queue length and estimated wait per service *before* committing
- **Live position tracking** — real-time queue position, ETA, and status powered by Firebase WebSocket
- **Proactive push notifications** — alerted at position 2 ("almost up") and position 1 ("you're next") even in background tabs
- **Token re-queue** — expired tokens can be re-issued within 2 hours without losing your place history
- **Appointment booking** — pre-book a visit by date, time, and service at `/book`
- **Confetti + sound alert** — browser celebration when your token is called
- **Token history** — all tokens ever taken on this device at `/history`
- **QR code on home page** — scan to join the queue without typing a URL
- **Email tracking link** — optional email with token number and live-tracking link
- **Feedback** — submit a star rating + comment after being served

### Admin portal (`/admin`)
- **Live dashboard** — real-time queue state per service with priority section, waiting list, serving-now card
- **Per-service pause** — pause and resume individual service queues independently; priority tokens always bypass
- **SLA wait alert** — red banner when any service exceeds the configured wait-time target
- **Live announcements** — broadcast a message to the display board and all customer screens instantly
- **Token lookup** — search any token by number, ID, or note; add inline notes from results
- **Call next / skip / no-show** — advance the queue or mark a token expired
- **Priority queue** — priority tokens served first across all service counters; regular queues auto-blocked until cleared
- **Pause / resume / reset** — full queue control including scheduled daily auto-reset
- **ML Auto Mode** — automatically calls next tokens on a dynamically calculated interval from historical traffic
- **Analytics dashboard** — peak-hour heatmap, hourly bar chart, service distribution, staff performance table, CSV export
- **Detailed report** — full traffic heatmap, drop-off rate, staffing AI suggestions, print to PDF
- **Appointment management** — list, confirm, and cancel customer bookings; confirmed appointments auto-merge into the queue ±5 min
- **Staff management** — create/remove staff, assign services, set PIN for kiosk login, see who is online/offline
- **Admin accounts** — manage up to 10 admin accounts at `/admin/manage`; bcrypt-hashed passwords
- **Feedback viewer** — customer ratings and comments with average score; record verbal feedback manually
- **Settings** — organisation name, industry profile, display board message, SLA target, auto-reset time
- **Admin profile** — edit display name, change password

### Staff portal (`/staff`)
- **Separate login** — staff authenticate with username + password or PIN via kiosk mode
- **Service-scoped dashboard** — call next for assigned service, skip / no-show current token
- **Token notes** — attach a short note to any called token (visible on display board and admin dashboard)
- **Announcement banner** — live admin broadcasts shown at top of staff view
- **Priority awareness** — alert when priority customers are waiting at other counters
- **Online/offline presence** — Firebase-powered live presence dots visible to admin
- **Staff kiosk** (`/kiosk`) — fullscreen PIN numpad for shared terminals

### Display board (`/display`)
- Fullscreen TV-optimised view — now-serving token per service, priority section, welcome banner, announcement banner, flash animation on token change, live clock

### Intelligent workspace (v1.4.x)

- **Custom queue management** (`/admin/queues`) — admins create their own queues within an Industry Type with full CRUD: create, edit, enable/disable, archive, **delete (blocked while active tokens exist)**, reorder, capacity, working hours, average service time, token prefix, and **per-queue staff assignment** + analytics. Dedicated Create and Manage screens.
- **Token referral / transfer** — move a live token between counters (e.g. hospital OPD → Eye Specialist); it keeps its number, records a referral trail, is served as priority-tier at the destination, and never auto-expires mid-transfer.
- **AI Assistant** — a floating ✦ button on every screen + a full-screen workspace (`/assistant`). Answers operational questions (longest wait, today's summary, predicted traffic, staffing) using **Retrieval-Augmented Generation over verified backend data** — it never fabricates figures. Pluggable providers (zero-config grounded default + optional OpenAI / Groq / OpenRouter / Ollama / Gemini). Persistent conversation history (pin, rename, delete, export).
- **Predictive insights** — explainable wait-time forecasts, congestion alerts, and recommendations from a trained model artefact (scikit-learn) with rule-based cold-start fallback.
- **Internal messaging** — a floating 💬 deck with **1:1 and group chat for admins & staff**, team directory, emoji reactions, read receipts ("Seen"), and inline attachments (≤256 KB). Real-time without external services.
- **Notification Center** — a header 🔔 with unread badge + a dedicated screen (`/notifications`); driven by an application-wide event bus (token referred, queue created, new message, …).
- **Secure sharing** — share queue snapshots / analytics as **capability links + QR codes** with a printable view (`/share/:id`) and expiry/revoke.
- **Shared files** (`/files`) — drag-and-drop sharing of reports, exports, PDFs, Excel, Word, ZIP (≤2 MB), **stored in RTDB to stay on the free Spark plan** (no Cloud Storage / Blaze).
- **Role-based access control** — **Super Admin > Admin > Manager > Staff**. Managers run operations; only Admins+ manage accounts; only Super Admin changes roles. **Audit log** of sensitive actions at `/admin/audit`.

### Industry profiles

Each Industry Type ships sensible default queues; admins can also add their own under **Queues**.

| Profile | Default queues |
|---|---|
| **General Office** | General Inquiry, Consultation, Transaction, Billing & Payments, Help & Support |
| **Bank / Finance** | New Account, Loan, Foreign Exchange, Card Services, Priority Banking, Locker, General Banking |
| **Medical / Hospital** | OPD, Eye Specialist, Cardiology, Dental, ENT, Dermatology, Orthopedics, Pediatrics, Gynecology, Lab, Pharmacy, Radiology, Emergency (auto-priority) |
| **Restaurant / Dining** | Table 1–2, Table 3–4, Table 5+, Reservation, Takeaway, Bar / Lounge |

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 18 | UI component framework |
| Vite | 8 | Build tool and dev server |
| React Router | 6 | Client-side routing |
| Tailwind CSS | 3 | Utility-first styling with custom design tokens |
| Firebase JS SDK | 12 | Real-time WebSocket subscriptions for live queue state, tokens, presence, and announcements |
| Axios | 1 | HTTP client with JWT interceptors |
| canvas-confetti | — | Confetti animation on token called |
| qrcode | — | QR code generation |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Node.js | 20 | JavaScript runtime |
| Express | 4 | REST API framework |
| Firebase Admin SDK | 14 | Realtime Database writes, atomic multi-path updates, presence management |
| MongoDB Atlas | via `mongodb` driver | Analytics event store (dual-written with CSV) |
| JSON Web Tokens | — | Admin and staff authentication, role + service claims |
| bcryptjs | — | Password hashing for admin accounts |
| Joi | — | Request validation and environment variable schema |
| express-rate-limit | — | Brute-force protection on PIN and login routes |
| nodemailer | — | Optional token email with tracking link |
| Jest + Supertest | — | Unit and integration tests (46 tests) |
| AI provider layer | — | Pluggable `AIProvider` (grounded default + OpenAI/Groq/OpenRouter/Ollama/Gemini) with RAG over verified data |
| Event bus | Node `EventEmitter` | Application-wide events decoupling queue, messaging, and notification modules |

### Database & Cloud

| Service | Purpose |
|---|---|
| Firebase Realtime Database | Live queue state, tokens, presence, announcements, appointments, admin accounts; custom queues; messaging, notifications & shared files (content via JWT API, real-time via content-free signal nodes) |
| MongoDB Atlas | Persistent analytics event log (`queue_events`) + full per-token lifecycle mirror (`tokens`) |

### Analytics / Data Mining

| Technology | Purpose |
|---|---|
| Python 3.11 | Pipeline language |
| pandas | Data cleaning, preprocessing, aggregation |
| scikit-learn | Linear regression with cyclical hour encoding (R² = 0.893, MAE = 2.21 min) |
| matplotlib | Chart generation (6 charts in QueueLess editorial style) |
| Jupyter Notebook | Analysis report (auto-generated, fully executed) |
| joblib | Model serialisation |

### DevOps & Hosting

| Service | Purpose |
|---|---|
| Vercel | Frontend hosting, auto-deploy on push to `main`, SPA rewrites |
| Render | Backend hosting, auto-deploy via `render.yaml` |
| Firebase | Realtime Database + Security Rules |
| GitHub Actions | CI — backend tests, frontend build, Firebase rules deploy |

---

## Project Structure

```
queueless/
├── backend/                        # Node.js + Express REST API → Render
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.js              # Joi environment validation
│   │   │   └── firebase.js         # Admin SDK init + database refs
│   │   ├── services/
│   │   │   ├── queue.service.js    # Token issuance, call next (regular + priority), skip, expiry,
│   │   │   │                       # per-service pause, re-queue, groupSize, staffUsername attribution
│   │   │   ├── auth.service.js     # Admin login, password change, profile
│   │   │   ├── staff.service.js    # Staff CRUD, PIN login, profile
│   │   │   ├── analytics.service.js# Dual-write (MongoDB + CSV), traffic stats, Firebase cross-ref,
│   │   │   │                       # staff performance metrics aggregation
│   │   │   ├── autoMode.service.js # ML-assisted auto-call with dynamic interval
│   │   │   ├── expiry.service.js   # Token expiry sweeper (every 5 min)
│   │   │   ├── scheduler.service.js# Daily auto-reset scheduler (Asia/Karachi TZ, setInterval)
│   │   │   ├── appointmentMerge.service.js # Auto-merge confirmed appointments → priority tokens (±5 min)
│   │   │   └── email.service.js    # Nodemailer (optional)
│   │   ├── controllers/
│   │   │   ├── admin.controller.js # Queue control, per-service pause, announcements, appointments,
│   │   │   │                       # notes, admin CRUD, staff metrics, config management
│   │   │   ├── staff.controller.js # Staff queue, notes, profile, password
│   │   │   ├── token.controller.js # Token issuance, status, re-queue
│   │   │   └── feedback.controller.js
│   │   ├── routes/
│   │   │   ├── admin.routes.js     # /admin/* — JWT-protected, admin role
│   │   │   ├── staff.routes.js     # /staff/* — JWT-protected, staff role
│   │   │   ├── token.routes.js     # /tokens/* — public (groupSize + requeue)
│   │   │   └── index.js            # /announcement, /appointments — public reads/posts
│   │   ├── middleware/
│   │   │   ├── auth.js             # JWT verification, role + service claim extraction
│   │   │   ├── validate.js         # Joi request body validation
│   │   │   └── errorHandler.js     # Centralised error responses
│   │   ├── utils/asyncHandler.js
│   │   ├── app.js                  # Express factory (CORS, rate-limit, routes)
│   │   └── server.js               # Entry point, graceful shutdown, scheduler + merge service boot
│   ├── tests/                      # Jest + Supertest
│   ├── .env.example
│   └── package.json
│
├── frontend/                       # React + Vite + Tailwind → Vercel
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx            # Landing page, QR code, announcement banner
│   │   │   ├── TakeToken.jsx       # Service selection, wait preview, priority toggle,
│   │   │   │                       # group size selector, per-service pause awareness
│   │   │   ├── BookAppointment.jsx # Appointment booking form (/book)
│   │   │   ├── MyToken.jsx         # Live token tracking, proactive push at pos 2 & 1,
│   │   │   │                       # re-queue button, group badge, confetti, QR code
│   │   │   ├── Lookup.jsx          # Recover token by ID or device storage
│   │   │   ├── Feedback.jsx        # Star rating + comment after served
│   │   │   ├── TokenHistory.jsx    # All tokens taken on this device
│   │   │   ├── Display.jsx         # TV display board — welcome banner, priority section, announcements
│   │   │   ├── AdminLogin.jsx
│   │   │   ├── AdminDashboard.jsx  # Queue control, per-service pause, SLA alert, announcements,
│   │   │   │                       # token lookup, notes, staffUsername attribution
│   │   │   ├── AdminAnalytics.jsx  # Heatmap, bar chart, staff performance table, CSV export
│   │   │   ├── AdminReport.jsx     # Traffic heatmap, hourly bar chart, AI suggestions
│   │   │   ├── AdminAppointments.jsx # Appointment list with confirm/cancel
│   │   │   ├── AdminStaff.jsx      # Create/remove staff, live presence, PIN
│   │   │   ├── AdminManage.jsx     # Multi-admin account management (up to 10)
│   │   │   ├── AdminFeedback.jsx   # Customer ratings, record verbal feedback
│   │   │   ├── AdminSetup.jsx      # Org name, industry, display message, SLA, auto-reset time
│   │   │   ├── AdminProfile.jsx    # Admin display name, account info
│   │   │   ├── AdminChangePassword.jsx
│   │   │   ├── StaffLogin.jsx
│   │   │   ├── StaffDashboard.jsx  # Service queue, token notes, skip, announcement
│   │   │   ├── StaffProfile.jsx    # Staff display name, account info
│   │   │   ├── StaffChangePassword.jsx
│   │   │   └── StaffKiosk.jsx      # Fullscreen PIN numpad (/kiosk)
│   │   ├── components/
│   │   │   ├── Layout.jsx          # Nav (Dashboard, Analytics, Staff, Admins, Settings),
│   │   │   │                       # ADMIN ▼ dropdown, dark mode toggle
│   │   │   ├── StatusBadge.jsx
│   │   │   └── Stat.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx     # Admin JWT state + updateUser helper
│   │   │   ├── StaffContext.jsx    # Staff JWT state + updateStaff helper
│   │   │   └── ThemeContext.jsx    # Dark mode toggle, persisted to localStorage
│   │   ├── hooks/
│   │   │   ├── useQueueState.js    # Firebase live — queue/state, tokens, announcements
│   │   │   ├── useAppConfig.js     # Fetches org config (industry, orgName, displayMessage, slaMinutes)
│   │   │   ├── usePresence.js      # Firebase onDisconnect presence for staff
│   │   │   └── usePushNotification.js
│   │   ├── services/api.js         # Axios client, JWT interceptors, all API calls
│   │   │                           # (apiCallNext/Priority carry staffUsername)
│   │   ├── utils/industry.js       # 4 industry profiles, getServices(), getServiceLabel()
│   │   └── firebase.js             # Firebase client SDK init
│   ├── tailwind.config.js
│   ├── vercel.json                 # SPA rewrites (/* → /index.html)
│   └── package.json
│
├── firebase/
│   ├── database.rules.json         # Security rules — read-only clients, server writes,
│   │                               # presence client-writable, schema validation
│   ├── firebase.json
│   └── .firebaserc
│
├── analytics/                      # Python data mining pipeline
│   ├── data_collection/
│   │   ├── data_simulator.py       # Synthetic events (bimodal demand, lognormal service)
│   │   ├── csv_writer.py
│   │   └── mongo_writer.py
│   ├── data_cleaning/
│   │   └── preprocess.py           # Raw events → tokens DataFrame, outlier flagging
│   ├── analysis/
│   │   ├── waiting_time.py         # Descriptive stats, grouped views
│   │   ├── peak_hours.py           # Frequency distribution, weekday × hour heatmap
│   │   ├── moving_average.py       # Rolling-average predictor with backtest
│   │   └── linear_regression.py    # sklearn LinearRegression, cyclical hour encoding
│   ├── visualization/
│   │   └── charts.py               # 6 matplotlib charts in QueueLess editorial style
│   ├── notebooks/QueueLess_Analysis.ipynb
│   ├── models/                     # Serialised regression model (.joblib)
│   ├── data/                       # CSV outputs + chart PNGs
│   ├── requirements.txt
│   ├── run_pipeline.py
│   └── build_notebook.py
│
├── .github/workflows/
│   ├── backend-ci.yml              # Jest tests on every push
│   ├── frontend-ci.yml             # Vite build verification
│   ├── analytics-ci.yml            # Python pipeline smoke test
│   └── firebase-rules.yml          # Deploy RTDB rules on rules file change
│
├── render.yaml                     # Render blueprint (build + start + env schema)
├── LICENSE
└── README.md
```

**New modules in v1.4.x** (not exhaustively expanded above):

```
backend/src/
├── ai/                  # AIProvider abstraction (grounded + LLM), RAG retrieval, assistant + conversation services
├── events/              # Application-wide event bus + subscriber registration
├── services/            # queueAdmin, prediction, messaging, notification, share, upload, audit services
├── controllers/         # assistant, messaging, notification, share, upload controllers
├── routes/              # assistant, messaging, share, upload routes
├── config/roles.js      # RBAC role hierarchy
└── models/predictions.json   # Shipped trained ML artefact (free-plan fallback)

frontend/src/
├── components/          # AssistantDock, MessagingDeck, NotificationBell, ShareDialog, QueueForm, LiveTimer, PredictiveInsights, ErrorBoundary
├── pages/               # AdminQueues(+New/+Edit), AdminAudit, AssistantWorkspace, Notifications, ShareView, SharedFiles, Credits
├── services/api/        # Modular API client (client, queue, queues, messaging, notifications, assistant, share, files, …) re-exported by api.js
└── hooks/useQueues.js · utils/queueRegistry.js   # Custom-queue resolution

analytics/models/train_predictor.py   # Trains GradientBoosting + IsolationForest → predictions.json
```

---

## Architecture

```
                    ┌──────────────────────────────────────────┐
                    │            React (Vercel)                │
                    │  /           → Home + QR + announcement  │
                    │  /take       → Token + group size + pause │
                    │  /book       → Appointment booking        │
                    │  /token/:id  → Live tracking + re-queue  │
                    │  /display    → TV board + welcome banner  │
                    │  /staff      → Staff dashboard + notes    │
                    │  /kiosk      → PIN numpad                 │
                    │  /admin      → Admin portal               │
                    │  /admin/manage → Multi-admin accounts     │
                    └────────┬──────────────────┬──────────────┘
                             │                  │
              REST /api/v1   │                  │  Firebase WebSocket
              (JWT auth)     │                  │  (onValue — live push)
                             ▼                  ▼
                    ┌──────────────────────────────────────────┐
                    │         Node.js / Express (Render)       │
                    │   — token issuance, group size           │
                    │   — priority + per-service pause engine  │
                    │   — re-queue (2-hour window)             │
                    │   — queue control (call/skip/pause)      │
                    │   — announcement broadcast               │
                    │   — appointment CRUD + auto-merge        │
                    │   — token notes                          │
                    │   — ML auto mode                         │
                    │   — admin + staff auth (JWT + bcrypt)    │
                    │   — token expiry sweeper (5 min)         │
                    │   — daily auto-reset scheduler           │
                    │   — dual-write: MongoDB + CSV            │
                    └────────┬──────────────────┬──────────────┘
                             │                  │
                             ▼                  ▼
        ┌───────────────────────────┐  ┌───────────────────────┐
        │  Firebase Realtime DB     │  │  MongoDB Atlas        │
        │  queue/state              │  │  queue_events         │
        │  queue/tokens             │  │  (staff_username,     │
        │  queue/announcement       │  │   wait durations,     │
        │  appointments/            │  │   service metrics)    │
        │  presence/{username}      │  │  (CSV fallback)       │
        │  config/                  │  └──────────┬────────────┘
        │  admins/ (bcrypt hashed)  │             │
        └───────────────────────────┘             ▼
                                       ┌───────────────────────┐
                                       │  Python DM pipeline   │
                                       │  pandas + sklearn     │
                                       │  R² 0.893 · MAE 2.21m │
                                       │  6 matplotlib charts  │
                                       └───────────────────────┘
```

### v1.4.x API surface (all under `/api/v1`)

| Module | Endpoints | Auth |
|---|---|---|
| Queues | `GET/POST /admin/queues`, `GET /admin/queues/:id`, `PUT /admin/queues/:id`, `PUT /admin/queues/:id/enabled`, `PUT /admin/queues/:id/archive`, `DELETE /admin/queues/:id`, `PUT /admin/queues/reorder`, `GET /admin/queues/:id/staff`, `GET /admin/queues/:id/analytics` | admin-tier |
| Referral | `POST /admin/queue/refer/:tokenId`, `POST /staff/queue/refer/:tokenId` | admin / staff |
| Predictions | `GET /admin/predictions` | admin-tier |
| AI assistant | `POST /assistant`, `GET/POST /assistant/conversations`, `GET/PUT/DELETE /assistant/conversations/:id` | admin / staff |
| Messaging | `GET /directory`, `GET/POST /conversations`, `GET/POST /conversations/:id/messages`, `PUT /conversations/:id/read`, `PUT /conversations/:id/messages/:mid/react` | admin / staff |
| Notifications | `GET /notifications`, `PUT /notifications/:id/read`, `PUT /notifications/read-all` | admin / staff |
| Sharing | `POST/GET /shares`, `DELETE /shares/:id`, `GET /share/:id` (public capability) | admin / staff |
| Shared files | `POST/GET /uploads`, `GET /uploads/:id`, `DELETE /uploads/:id` | admin / staff |
| RBAC + audit | `POST /admin/admins` (role), `PUT /admin/admins/:username/role` (superadmin), `GET /admin/audit` | admin / superadmin |

Message, notification, and file **content is served only via the JWT API**; the Realtime Database holds only **content-free signal nodes** (`messageSignals`, `notificationSignals`) that clients subscribe to for real-time refresh — no Firebase Auth required.

---

## Quick Start (Local)

### Backend

```bash
cd backend
cp .env.example .env
# Fill in: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY,
#          FIREBASE_DATABASE_URL, JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD
npm install
npm test        # Jest + Supertest
npm run dev     # http://localhost:4000
```

### Frontend

```bash
cd frontend
cp .env.example .env.local
# Fill in: VITE_API_BASE_URL=http://localhost:4000/api/v1
# Fill in all VITE_FIREBASE_* values from Firebase Console > Project Settings
npm install
npm run dev     # http://localhost:5173
```

### Analytics Pipeline

```bash
cd analytics
pip install -r requirements.txt
python run_pipeline.py
# Simulates 4,400+ events → cleans → trains model → generates 6 charts
# If analytics/data/queue_events.csv exists from the live backend, uses real data
```

---

## Deployment

### Firebase Rules

```bash
cd firebase
firebase login
firebase deploy --only database
```

### Backend → Render

1. New Web Service → connect this repo → root directory: `backend`
2. Render auto-detects `render.yaml` for build/start commands
3. Add secret environment variables in Render dashboard (see `backend/.env.example`)

### Frontend → Vercel

1. New Project → connect this repo → root directory: `frontend`
2. Framework: Vite (auto-detected) — `frontend/vercel.json` handles SPA rewrites
3. Add all `VITE_*` environment variables from `frontend/.env.example`

---

## Cloud Computing Concepts Applied

| Concept | Implementation |
|---|---|
| PaaS hosting | Vercel (frontend CDN + serverless) + Render (backend web service) |
| NoSQL cloud databases | Firebase Realtime Database (operational) + MongoDB Atlas (analytics) |
| Real-time data sync | Firebase `onValue` WebSocket listeners — zero-polling live queue state |
| Dual-write pattern | Every queue event written atomically to MongoDB + CSV for redundancy |
| REST API design | Versioned at `/api/v1/`, role-segregated routes, Joi schema validation |
| Stateless JWT auth | Admin + staff roles, service claim embedded in staff token |
| Role-based access control | `requireAdmin` / `requireStaff` / `requireRole(min)` middleware; **Super Admin > Admin > Manager > Staff** hierarchy; per-admin bcrypt accounts; audit log of sensitive actions |
| AI provider abstraction | `AIProvider` interface with grounded (zero-config) + OpenAI/Groq/OpenRouter/Ollama/Gemini providers, selected via `AI_PROVIDER`; RAG grounding so no operational data is ever fabricated |
| Capability-based sharing | Secure share links (128-bit random ids) + QR codes, served read-only via the API with expiry/revoke |
| Firebase Security Rules | Schema-validated RTDB rules — clients read-only, server writes, presence client-writable |
| Presence detection | Firebase `onDisconnect()` for real-time staff online/offline state |
| CI/CD pipelines | GitHub Actions — automated tests, build verification, rules deploy on merge |
| Atomic multi-path updates | Single Firebase `update()` call for consistent token status transitions |
| Event-driven architecture | Queue state changes propagate to all connected clients via Firebase push |
| Scheduled background tasks | `setInterval` auto-reset scheduler and appointment-merge service — no cron daemon required |

## Data Mining Concepts Applied

| Concept | Implementation |
|---|---|
| Data collection | Backend dual-write + `data_simulator.py` synthetic event generator (bimodal demand, lognormal service times) |
| Data cleaning | `preprocess.py` — type coercion, missing-value handling, outlier flagging, derived feature columns |
| Descriptive statistics | Wait-time mean, median, std, percentiles grouped by service and hour |
| Frequency distribution | Hourly volume bar chart, queue-length histogram |
| Aggregation & grouping | Peak-hour heatmap by service × weekday × hour; staff performance by username |
| Trend analysis | 7-day daily token count with rolling average |
| Feature engineering | Cyclical encoding of hour-of-day (`sin`/`cos`) to preserve continuity across midnight |
| Supervised learning | `sklearn.LinearRegression` for wait-time prediction — R² = 0.893, MAE = 2.21 min |
| Moving-average baseline | Backtest predictor with no data leakage for comparison against regression |
| Model serialisation | `joblib` saves trained model to `models/` for reuse without retraining |
| Visualisation | 6 matplotlib charts rendered in QueueLess editorial style |
| Live in-browser analytics | Admin Analytics — peak hours, service distribution, staff metrics, drop-off rate, auto-refresh every 30s |
| Interactive report | Admin Report — traffic heatmap, hourly bar chart, AI staffing recommendations, print to PDF |

---

## Releases

For detailed release notes and changelogs, see [CHANGELOG.md](CHANGELOG.md).

| Version | Codename | Highlights |
|---|---|---|
| v1.4.5 | Intelligent Collaboration | AI assistant (RAG) + workspace, internal messaging (1:1/group, reactions, receipts, attachments), event bus + notification center, secure sharing + QR, shared files (Spark-free), RBAC + audit log |
| v1.4.0 | Relay | Token referral between counters, custom queue management, live "serving for" timer + next-in-queue, Industry Type rename, trained ML predictions, credits page |
| [v1.3.5](CHANGELOG.md#queueless-v135--pulse-latest) | Pulse | Proactive push alerts, per-service pause, re-queue, group tokens, SLA alerts, staff metrics, multi-admin, auto-reset, appointment merge |
| [v1.3.0](CHANGELOG.md#queueless-v130--crew) | Crew | Profile management, priority queue engine, 8 new features, 0 vulnerabilities |
| [v1.2.2](CHANGELOG.md#queueless-v122--vision) | Vision | Analytics report, AI suggestions, dynamic heatmap, UI fixes |
| [v1.2.0](CHANGELOG.md#queueless-v120--scope) | Scope | Initial release — core queue system, analytics dashboard, staff portal |

---

## License

This project is licensed under the [MIT License](LICENSE) © 2026 M Sufiyan Aasim ([@msufiyanpk](https://github.com/msufiyanpk)).
