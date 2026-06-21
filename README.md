# QueueLess — Smart Queue Token Management System

> **Bahria University Karachi · Department of Software Engineering · Spring 2026**
> Submitted for two parallel course requirements:
> - **SEL-401 Cloud Computing Lab** — *QueueLess: Smart Token & Queue Management System*
> - **CSL-460 Data Mining Lab** — *QueueLess: Smart Queue Analytics & Prediction System*

**Live:** [queueless-beta.vercel.app](https://queueless-beta.vercel.app)  
**Author:** Muhammad Sufiyan Aasim · [@msufiyanpk](https://github.com/msufiyanpk)  
**Institution:** Bahria University Karachi · Department of Software Engineering

---

## What is QueueLess?

QueueLess is a full-stack digital queue management system that replaces paper tokens with a real-time, browser-based experience. Customers take tokens from their phone, track their live position in the queue, and get notified the moment their number is called — no app download required.

Admins and staff manage the queue from a dedicated portal with a live dashboard, ML-assisted auto mode, analytics, and per-service staff portals. Every queue event is dual-written to both MongoDB Atlas and a CSV event log, feeding a Python data mining pipeline that performs waiting-time predictions, peak-hour heatmaps, and staffing recommendations.

---

## Features

### Customer-facing
- **Take a token** — pick a service, request priority if needed (elderly, medical, VIP), and get a token number instantly
- **Live position tracking** — real-time queue position with estimated wait time, powered by Firebase WebSocket
- **Confetti + sound alert** — browser celebration when your token is called
- **Push notifications** — browser notification when your number is called, even in a background tab
- **Token history** — see all tokens ever taken on this device
- **QR code on home page** — scan to join the queue without typing a URL
- **Email tracking link** — optional email with your token number and live-tracking link
- **Feedback** — submit a star rating + comment after being served

### Admin portal (`/admin`)
- **Live dashboard** — real-time queue state per service, waiting list with priority badges, serving-now card
- **Call next / skip / no-show** — advance the queue or mark a token expired
- **Pause / resume / reset** — full queue control
- **ML Auto Mode** — automatically calls next tokens on a dynamically calculated interval derived from historical wait times and time-of-day traffic patterns
- **Priority token system** — priority tokens (VIP, emergency, elderly) are always served before normal tokens, FIFO within same level
- **Analytics dashboard** — 7-day bar chart, service distribution, CSV export, auto-refreshes every 30 seconds
- **Detailed report** — full traffic heatmap by service and hour, drop-off rate, staffing recommendations, print to PDF
- **Staff management** — create/remove staff members, assign services, set optional PIN for kiosk login, see who is online/offline in real time
- **Feedback viewer** — read all customer ratings and comments with average score
- **Settings** — set organisation name, switch industry profile (General / Bank / Medical / Restaurant)
- **Password change** — change admin password from within the portal

### Staff portal (`/staff`)
- **Separate login** — staff authenticate with username + password or PIN via kiosk mode
- **Service-scoped dashboard** — staff can only call next for their assigned service
- **Online/offline presence** — Firebase-powered live presence dots visible to admin
- **Staff kiosk** (`/kiosk`) — fullscreen PIN numpad for shared terminals, shake animation on wrong PIN

### Display board (`/display`)
- Fullscreen TV-optimised view showing the currently called token per service, no login required

### Industry profiles
Four built-in profiles that configure the available services across the entire system:

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
| Vite | 5 | Build tool & dev server |
| React Router | v6 | Client-side routing |
| Tailwind CSS | 3 | Utility-first styling with custom design tokens |
| Firebase JS SDK | 10 | Real-time WebSocket subscriptions for live queue state and staff presence |
| Axios | 1.x | HTTP client with JWT interceptors |
| canvas-confetti | — | Confetti animation on token called |
| qrcode | — | QR code generation on home page |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | 20 | JavaScript runtime |
| Express.js | 4 | REST API framework |
| Firebase Admin SDK | 12 | Realtime Database writes, atomic multi-path updates, presence management |
| MongoDB Atlas | via `mongodb` driver | Analytics event store (dual-written with CSV) |
| JSON Web Tokens | — | Admin and staff authentication, role + service claims |
| bcryptjs | — | Password hashing for admin and staff PINs |
| Joi | — | Environment variable validation at boot |
| express-rate-limit | — | PIN login brute-force protection |
| nodemailer | — | Optional token email with tracking link |
| Jest + Supertest | — | Unit and integration tests |

### Database & Cloud
| Service | Purpose |
|---|---|
| Firebase Realtime Database | Live queue state (`queue/state`, `queue/tokens`, `presence`) |
| MongoDB Atlas | Persistent analytics event log (`queue_events` collection) |

### Analytics / Data Mining
| Technology | Purpose |
|---|---|
| Python 3.11 | Pipeline language |
| pandas | Data cleaning, preprocessing, aggregation |
| scikit-learn | Linear regression with cyclical hour encoding (R² = 0.893, MAE = 2.21 min) |
| matplotlib | Chart generation (6 charts in QueueLess editorial style) |
| Jupyter Notebook | Academic report (auto-generated, fully executed) |
| joblib | Model serialisation |

### DevOps & Hosting
| Service | Purpose |
|---|---|
| Vercel | Frontend hosting, auto-deploy on push to `main`, SPA rewrites |
| Render | Backend hosting, auto-deploy via `render.yaml` |
| Firebase | Realtime Database + Security Rules |
| GitHub Actions | CI workflows — backend tests, frontend build verification, Firebase rules deploy |

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
│   │   │   ├── queue.service.js    # Token issuance, call next, skip, expiry
│   │   │   ├── auth.service.js     # Admin login, password change
│   │   │   ├── staff.service.js    # Staff CRUD, PIN login
│   │   │   ├── analytics.service.js# Dual-write (MongoDB + CSV), traffic stats
│   │   │   ├── autoMode.service.js # ML-assisted auto-call with dynamic interval
│   │   │   ├── expiry.service.js   # Token expiry sweeper (every 5 min)
│   │   │   └── email.service.js    # Nodemailer (optional)
│   │   ├── controllers/
│   │   │   ├── admin.controller.js
│   │   │   ├── staff.controller.js
│   │   │   ├── token.controller.js
│   │   │   └── feedback.controller.js
│   │   ├── routes/
│   │   │   ├── admin.routes.js     # /admin/* — JWT protected, admin role only
│   │   │   ├── staff.routes.js     # /staff/* — JWT protected, staff role
│   │   │   └── token.routes.js     # /tokens/* — public
│   │   ├── middleware/
│   │   │   ├── auth.js             # JWT verification, role + service extraction
│   │   │   ├── validate.js         # Joi request body validation
│   │   │   └── errorHandler.js     # Centralised error responses
│   │   ├── utils/
│   │   │   └── asyncHandler.js
│   │   ├── app.js                  # Express factory (CORS, rate-limit, routes)
│   │   └── server.js               # Entry point, graceful shutdown, expiry sweep boot
│   ├── tests/                      # Jest + Supertest
│   ├── .env.example
│   └── package.json
│
├── frontend/                       # React + Vite + Tailwind → Vercel
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx            # Landing page + QR code to join queue
│   │   │   ├── TakeToken.jsx       # Service selection, priority toggle, email
│   │   │   ├── MyToken.jsx         # Live token tracking, confetti, push notification
│   │   │   ├── Lookup.jsx          # Recover token by ID or from device storage
│   │   │   ├── Feedback.jsx        # Star rating + comment after served
│   │   │   ├── TokenHistory.jsx    # All tokens taken on this device
│   │   │   ├── Display.jsx         # TV display board (/display)
│   │   │   ├── AdminLogin.jsx
│   │   │   ├── AdminDashboard.jsx  # Live queue, call next, skip, pause, auto mode
│   │   │   ├── AdminAnalytics.jsx  # 7-day chart, service distribution, CSV export
│   │   │   ├── AdminReport.jsx     # Heatmap, staffing AI suggestions, print to PDF
│   │   │   ├── AdminStaff.jsx      # Create/remove staff, live presence, PIN field
│   │   │   ├── AdminFeedback.jsx   # Customer ratings viewer
│   │   │   ├── AdminSetup.jsx      # Org name, industry profile
│   │   │   ├── AdminChangePassword.jsx
│   │   │   ├── StaffLogin.jsx      # Staff username + password login
│   │   │   ├── StaffDashboard.jsx  # Service-scoped queue view for staff
│   │   │   └── StaffKiosk.jsx      # Fullscreen PIN numpad (/kiosk)
│   │   ├── components/
│   │   │   ├── Layout.jsx          # Nav (public / admin / staff), dark mode toggle, hamburger
│   │   │   ├── StatusBadge.jsx
│   │   │   └── Stat.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx     # Admin JWT state
│   │   │   ├── StaffContext.jsx    # Staff JWT state + loginDirect for kiosk
│   │   │   └── ThemeContext.jsx    # Dark mode toggle, persisted to localStorage
│   │   ├── hooks/
│   │   │   ├── useQueueState.js    # Firebase live subscription to queue/state + tokens
│   │   │   ├── useTokenLive.js     # Live subscription to a single token
│   │   │   ├── useAppConfig.js     # Fetches org config (industry, orgName)
│   │   │   ├── usePresence.js      # Firebase onDisconnect presence for staff
│   │   │   └── usePushNotification.js # Browser Notifications API wrapper
│   │   ├── services/
│   │   │   └── api.js              # Axios client, JWT interceptor (admin vs staff routing)
│   │   ├── utils/
│   │   │   └── industry.js         # 4 industry profiles, getServices(), getServiceLabel()
│   │   └── firebase.js             # Firebase client SDK init
│   ├── public/
│   │   ├── svg/                    # QueueLess SVG brand assets
│   │   └── png/                    # PNG brand assets
│   ├── tailwind.config.js          # Custom design tokens + dark mode + animate-shake
│   ├── vercel.json                 # SPA rewrites (/* → /index.html)
│   └── package.json
│
├── firebase/
│   ├── database.rules.json         # Security rules — clients read-only, server writes,
│   │                               # presence node client-writable, schema validation
│   ├── firebase.json               # Firebase project config for CLI deploy
│   └── .firebaserc                 # Project alias (queueless-tqms-pk)
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
│   ├── notebooks/
│   │   └── QueueLess_Analysis.ipynb
│   ├── models/                     # Serialised regression model (.joblib)
│   ├── data/                       # CSV outputs + chart PNGs (regenerated on each run)
│   ├── requirements.txt
│   ├── run_pipeline.py             # End-to-end orchestrator
│   └── build_notebook.py           # Auto-generates the Jupyter notebook
│
├── .github/
│   └── workflows/
│       ├── backend-ci.yml          # Jest tests on every push
│       ├── frontend-ci.yml         # Vite build verification
│       ├── analytics-ci.yml        # Python pipeline smoke test
│       └── firebase-rules.yml      # Deploy RTDB rules when database.rules.json changes
│
├── render.yaml                     # Render blueprint (build + start + env var schema)
├── LICENSE                         # MIT
└── README.md
```

---

## Architecture

```
                    ┌──────────────────────────────────┐
                    │     React (Vercel)               │
                    │  /           → Home + QR code    │
                    │  /take       → Issue token        │
                    │  /token/:id  → Live tracking      │
                    │  /display    → TV display board   │
                    │  /staff      → Staff dashboard    │
                    │  /kiosk      → PIN numpad         │
                    │  /admin      → Admin portal       │
                    └────────┬──────────────┬───────────┘
                             │              │
              REST /api/v1   │              │ Firebase WebSocket
              (JWT auth)     │              │ (onValue — live state)
                             ▼              ▼
                    ┌──────────────────────────────────┐
                    │   Node.js / Express (Render)     │
                    │   — token issuance               │
                    │   — queue control (call/skip)    │
                    │   — ML auto mode                 │
                    │   — staff + admin auth (JWT)     │
                    │   — expiry sweeper (5 min cron)  │
                    │   — DUAL-WRITE: MongoDB + CSV    │
                    └────────┬──────────────┬───────────┘
                             │              │
                             ▼              ▼
        ┌────────────────────────┐   ┌────────────────────────┐
        │ Firebase Realtime DB  │   │  MongoDB Atlas          │
        │ queue/state           │   │  queue_events           │
        │ queue/tokens          │   │  (CSV fallback)         │
        │ presence/{username}   │   │                         │
        │ config/industry       │   └───────────┬────────────┘
        │ admins (private)      │               │
        └────────────────────────┘               ▼
                                        ┌────────────────────────┐
                                        │  Python DM pipeline    │
                                        │  pandas + sklearn      │
                                        │  R² 0.893 · MAE 2.21m  │
                                        │  6 matplotlib charts   │
                                        └────────────────────────┘
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
npm test        # 9 tests, all green
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

## Cloud Computing Concepts Demonstrated

| Concept | Implementation |
|---|---|
| Cloud hosting (PaaS) | Vercel (frontend) + Render (backend) |
| NoSQL cloud database | Firebase Realtime Database + MongoDB Atlas |
| Real-time data sync | Firebase `onValue` WebSocket listeners |
| REST API design | Versioned at `/api/v1/`, role-segregated routes |
| JWT authentication | Admin + staff roles, service claim on staff token |
| Role-based access control | `requireAdmin` / `requireStaff` middleware |
| CI/CD pipelines | GitHub Actions — tests + build verification + rules deploy |
| Security rules | Firebase RTDB rules — schema validation, read-only for clients |
| Dual-write analytics | Every queue event → MongoDB + CSV simultaneously |
| Presence detection | Firebase `onDisconnect()` for real-time staff online/offline |

## Data Mining Concepts Demonstrated

| Concept | Implementation |
|---|---|
| Data collection | Backend dual-write + `data_simulator.py` synthetic generator |
| Data cleaning | `preprocess.py` — type coercion, outlier flagging, derived columns |
| Aggregation | Grouped wait times per service and hour |
| Frequency distribution | Hourly volume bar chart, queue-length histogram |
| Trend analysis | 7-day daily token count line chart |
| Linear regression | sklearn with cyclical hour encoding (R² = 0.893, MAE = 2.21 min) |
| Moving-average predictor | Backtest with no data leakage |
| Model serialisation | joblib in `models/` |
| Visualisation | 6 matplotlib charts in QueueLess editorial style |
| Live in-browser analytics | AdminAnalytics — peak hours, service distribution, drop-off rate |
| Interactive report | AdminReport — dynamic heatmap + AI staffing suggestions + print to PDF |

---

## License

[MIT](LICENSE) © 2026 M Sufiyan Aasim ([@msufiyanpk](https://github.com/msufiyanpk))
