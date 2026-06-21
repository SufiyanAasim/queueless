# QueueLess — Smart Queue Token Management System

**Live:** [queueless-beta.vercel.app](https://queueless-beta.vercel.app)  
**Author:** Muhammad Sufiyan Aasim · [@msufiyanpk](https://github.com/msufiyanpk)  
**Latest release:** [v1.3.0 — Crew](https://github.com/msufiyanpk/queueless/releases/tag/v1.3.0)

QueueLess is a full-stack, cloud-native digital queue management system that replaces paper tokens with a real-time browser experience. Customers take tokens from any device, track their live position, and get notified the moment their number is called — no app download required.

Admins and staff manage the queue from a dedicated portal with a live dashboard, ML-assisted auto mode, granular analytics, and per-service staff portals. Every queue event is dual-written to MongoDB Atlas and a CSV event log, feeding a data mining pipeline that performs wait-time predictions, peak-hour heatmaps, and staffing recommendations.

---

## Features

### Customer-facing
- **Take a token** — pick a service, request priority if needed (elderly, medical, VIP), and get a token number instantly
- **Wait preview** — see live queue length and estimated wait per service *before* committing
- **Live position tracking** — real-time queue position, ETA, and status powered by Firebase WebSocket
- **Appointment booking** — pre-book a visit by date, time, and service at `/book`
- **Confetti + sound alert** — browser celebration when your token is called
- **Push notifications** — browser notification when called, even in a background tab
- **Token history** — all tokens ever taken on this device at `/history`
- **QR code on home page** — scan to join the queue without typing a URL
- **Email tracking link** — optional email with token number and live-tracking link
- **Feedback** — submit a star rating + comment after being served

### Admin portal (`/admin`)
- **Live dashboard** — real-time queue state per service with priority section, waiting list, serving-now card
- **Live announcements** — broadcast a message to the display board and all customer screens instantly
- **Token lookup** — search any token by number, ID, or note; add inline notes from results
- **Call next / skip / no-show** — advance the queue or mark a token expired
- **Priority queue** — priority tokens served first across all service counters; regular queues auto-blocked until cleared
- **Pause / resume / reset** — full queue control
- **ML Auto Mode** — automatically calls next tokens on a dynamically calculated interval from historical traffic
- **Analytics dashboard** — peak-hour heatmap, hourly bar chart, service distribution, CSV export
- **Detailed report** — full traffic heatmap, drop-off rate, staffing AI suggestions, print to PDF
- **Appointment management** — list, confirm, and cancel customer bookings at `/admin/appointments`
- **Staff management** — create/remove staff, assign services, set PIN for kiosk login, see who is online/offline
- **Feedback viewer** — customer ratings and comments with average score; record verbal feedback manually
- **Settings** — set organisation name, switch industry profile
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
- Fullscreen TV-optimised view — now-serving token per service, priority section, announcement banner, flash animation on token change, live clock

### Industry profiles

| Profile | Services |
|---|---|
| **General Office** | General Inquiry, Consultation, Transaction |
| **Bank / Finance** | New Account, Loan Application, Foreign Exchange, Card Services, General Banking |
| **Medical / Hospital** | OPD / Doctor, Lab Tests, Pharmacy, Radiology, Emergency (auto-priority) |
| **Restaurant / Dining** | Table 1–2, Table 3–4, Table 5+, Takeaway |

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
| bcryptjs | — | Password hashing |
| Joi | — | Request validation and environment variable schema |
| express-rate-limit | — | Brute-force protection on PIN and login routes |
| nodemailer | — | Optional token email with tracking link |
| Jest + Supertest | — | Unit and integration tests |

### Database & Cloud

| Service | Purpose |
|---|---|
| Firebase Realtime Database | Live queue state, tokens, presence, announcements, appointments |
| MongoDB Atlas | Persistent analytics event log (`queue_events`) |

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
│   │   │   ├── queue.service.js    # Token issuance, call next (regular + priority), skip, expiry
│   │   │   ├── auth.service.js     # Admin login, password change, profile
│   │   │   ├── staff.service.js    # Staff CRUD, PIN login, profile
│   │   │   ├── analytics.service.js# Dual-write (MongoDB + CSV), traffic stats
│   │   │   ├── autoMode.service.js # ML-assisted auto-call with dynamic interval
│   │   │   ├── expiry.service.js   # Token expiry sweeper (every 5 min)
│   │   │   └── email.service.js    # Nodemailer (optional)
│   │   ├── controllers/
│   │   │   ├── admin.controller.js # Queue control, announcements, appointments, notes
│   │   │   ├── staff.controller.js # Staff queue, notes, profile, password
│   │   │   ├── token.controller.js
│   │   │   └── feedback.controller.js
│   │   ├── routes/
│   │   │   ├── admin.routes.js     # /admin/* — JWT-protected, admin role
│   │   │   ├── staff.routes.js     # /staff/* — JWT-protected, staff role
│   │   │   ├── token.routes.js     # /tokens/* — public
│   │   │   └── index.js            # /announcement, /appointments — public reads/posts
│   │   ├── middleware/
│   │   │   ├── auth.js             # JWT verification, role + service claim extraction
│   │   │   ├── validate.js         # Joi request body validation
│   │   │   └── errorHandler.js     # Centralised error responses
│   │   ├── utils/asyncHandler.js
│   │   ├── app.js                  # Express factory (CORS, rate-limit, routes)
│   │   └── server.js               # Entry point, graceful shutdown, expiry sweep
│   ├── tests/                      # Jest + Supertest
│   ├── .env.example
│   └── package.json
│
├── frontend/                       # React + Vite + Tailwind → Vercel
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx            # Landing page, QR code, announcement banner
│   │   │   ├── TakeToken.jsx       # Service selection, wait preview, priority toggle
│   │   │   ├── BookAppointment.jsx # Appointment booking form (/book)
│   │   │   ├── MyToken.jsx         # Live token tracking, confetti, push notifications
│   │   │   ├── Lookup.jsx          # Recover token by ID or device storage
│   │   │   ├── Feedback.jsx        # Star rating + comment after served
│   │   │   ├── TokenHistory.jsx    # All tokens taken on this device
│   │   │   ├── Display.jsx         # TV display board — priority section, announcements
│   │   │   ├── AdminLogin.jsx
│   │   │   ├── AdminDashboard.jsx  # Queue control, announcements panel, token lookup, notes
│   │   │   ├── AdminAnalytics.jsx  # Heatmap, bar chart, CSV export
│   │   │   ├── AdminReport.jsx     # Traffic heatmap, hourly bar chart, AI suggestions
│   │   │   ├── AdminAppointments.jsx # Appointment list with confirm/cancel
│   │   │   ├── AdminStaff.jsx      # Create/remove staff, live presence, PIN
│   │   │   ├── AdminFeedback.jsx   # Customer ratings, record verbal feedback
│   │   │   ├── AdminSetup.jsx      # Org name, industry profile
│   │   │   ├── AdminProfile.jsx    # Admin display name, account info
│   │   │   ├── AdminChangePassword.jsx
│   │   │   ├── StaffLogin.jsx
│   │   │   ├── StaffDashboard.jsx  # Service queue, token notes, skip, announcement
│   │   │   ├── StaffProfile.jsx    # Staff display name, account info
│   │   │   ├── StaffChangePassword.jsx
│   │   │   └── StaffKiosk.jsx      # Fullscreen PIN numpad (/kiosk)
│   │   ├── components/
│   │   │   ├── Layout.jsx          # Nav, ADMIN/Staff dropdown, dark mode toggle
│   │   │   ├── StatusBadge.jsx
│   │   │   └── Stat.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx     # Admin JWT state + updateUser helper
│   │   │   ├── StaffContext.jsx    # Staff JWT state + updateStaff helper
│   │   │   └── ThemeContext.jsx    # Dark mode toggle, persisted to localStorage
│   │   ├── hooks/
│   │   │   ├── useQueueState.js    # Firebase live — queue/state, tokens, announcements
│   │   │   ├── useAppConfig.js     # Fetches org config (industry, orgName)
│   │   │   ├── usePresence.js      # Firebase onDisconnect presence for staff
│   │   │   └── usePushNotification.js
│   │   ├── services/api.js         # Axios client, JWT interceptors, all API calls
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

---

## Architecture

```
                    ┌──────────────────────────────────────────┐
                    │            React (Vercel)                │
                    │  /           → Home + QR + announcement  │
                    │  /take       → Issue token + wait preview │
                    │  /book       → Appointment booking        │
                    │  /token/:id  → Live tracking              │
                    │  /display    → TV display board           │
                    │  /staff      → Staff dashboard + notes    │
                    │  /kiosk      → PIN numpad                 │
                    │  /admin      → Admin portal               │
                    └────────┬──────────────────┬──────────────┘
                             │                  │
              REST /api/v1   │                  │  Firebase WebSocket
              (JWT auth)     │                  │  (onValue — live push)
                             ▼                  ▼
                    ┌──────────────────────────────────────────┐
                    │         Node.js / Express (Render)       │
                    │   — token issuance + priority engine     │
                    │   — queue control (call/skip/pause)      │
                    │   — announcement broadcast               │
                    │   — appointment CRUD                     │
                    │   — token notes                          │
                    │   — ML auto mode                         │
                    │   — admin + staff auth (JWT)             │
                    │   — token expiry sweeper (5 min)         │
                    │   — dual-write: MongoDB + CSV            │
                    └────────┬──────────────────┬──────────────┘
                             │                  │
                             ▼                  ▼
        ┌───────────────────────────┐  ┌───────────────────────┐
        │  Firebase Realtime DB     │  │  MongoDB Atlas        │
        │  queue/state              │  │  queue_events         │
        │  queue/tokens             │  │  (CSV fallback)       │
        │  queue/announcement       │  └──────────┬────────────┘
        │  appointments/            │             │
        │  presence/{username}      │             ▼
        │  config/                  │  ┌───────────────────────┐
        │  admins/ (private)        │  │  Python DM pipeline   │
        └───────────────────────────┘  │  pandas + sklearn     │
                                       │  R² 0.893 · MAE 2.21m │
                                       │  6 matplotlib charts  │
                                       └───────────────────────┘
```

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
| Role-based access control | `requireAdmin` / `requireStaff` Express middleware |
| Firebase Security Rules | Schema-validated RTDB rules — clients read-only, server writes, presence client-writable |
| Presence detection | Firebase `onDisconnect()` for real-time staff online/offline state |
| CI/CD pipelines | GitHub Actions — automated tests, build verification, rules deploy on merge |
| Atomic multi-path updates | Single Firebase `update()` call for consistent token status transitions |
| Event-driven architecture | Queue state changes propagate to all connected clients via Firebase push |

## Data Mining Concepts Applied

| Concept | Implementation |
|---|---|
| Data collection | Backend dual-write + `data_simulator.py` synthetic event generator (bimodal demand, lognormal service times) |
| Data cleaning | `preprocess.py` — type coercion, missing-value handling, outlier flagging, derived feature columns |
| Descriptive statistics | Wait-time mean, median, std, percentiles grouped by service and hour |
| Frequency distribution | Hourly volume bar chart, queue-length histogram |
| Aggregation & grouping | Peak-hour heatmap by service × weekday × hour |
| Trend analysis | 7-day daily token count with rolling average |
| Feature engineering | Cyclical encoding of hour-of-day (`sin`/`cos`) to preserve continuity across midnight |
| Supervised learning | `sklearn.LinearRegression` for wait-time prediction — R² = 0.893, MAE = 2.21 min |
| Moving-average baseline | Backtest predictor with no data leakage for comparison against regression |
| Model serialisation | `joblib` saves trained model to `models/` for reuse without retraining |
| Visualisation | 6 matplotlib charts rendered in QueueLess editorial style |
| Live in-browser analytics | Admin Analytics — peak hours, service distribution, drop-off rate, auto-refresh every 30s |
| Interactive report | Admin Report — traffic heatmap, hourly bar chart, AI staffing recommendations, print to PDF |

---

## Releases

For detailed release notes and changelogs, see [CHANGELOG.md](CHANGELOG.md).

| Version | Codename | Highlights |
|---|---|---|
| [v1.3.0](CHANGELOG.md#queueless-v130--crew-latest) | Crew | Profile management, priority queue engine, 8 new features, 0 vulnerabilities |
| [v1.2.2](CHANGELOG.md#queueless-v122--analytics--stability) | — | Analytics report, AI suggestions, dynamic heatmap, UI fixes |
| [v1.2.0](CHANGELOG.md#queueless-v120--initial-public-release) | — | Initial release — core queue system, analytics dashboard, staff portal |

---

## License

This project is licensed under the [MIT License](LICENSE) © 2026 M Sufiyan Aasim ([@msufiyanpk](https://github.com/msufiyanpk)).
