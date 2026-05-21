# QueueLess — Smart Queue Management & Analytics

> **Bahria University Karachi · Department of Software Engineering · Spring 2026**
> A unified project covering two parallel course submissions:
> - **SEL-401 Cloud Computing Lab** — *QueueLess: Smart Token & Queue Management System*
> - **CSL-460 Data Mining Lab** — *QueueLess: Smart Queue Analytics & Prediction System*

---

This project spans two layers of the *same* system. The Cloud Computing project issues digital tokens and tracks live queue state in Firebase; every queue event is *dual-written* to both MongoDB Atlas and a CSV event log. The Data Mining project mines that log for waiting-time predictions, peak-hour patterns, and operational insights. Keeping the code in one repository means the schema cannot drift — what the backend writes is exactly what the pipeline expects to read.

**Author:** Muhammad Sufiyan Aasim  
**GitHub:** [msufiyanpk](https://github.com/msufiyanpk)  
**Institution:** Bahria University Karachi Campus · Department of Software Engineering

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | UI component framework |
| **Vite** | Build tool & dev server |
| **React Router v6** | Client-side routing |
| **Tailwind CSS** | Utility-first styling with custom design tokens |
| **Firebase JS SDK** | Real-time WebSocket subscriptions for live queue state |
| **Axios** | HTTP client with JWT interceptors |
| **Vercel** | Hosting & CI/CD (auto-deploy on push to `main`) |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js 20** | JavaScript runtime |
| **Express.js** | REST API framework |
| **Firebase Admin SDK** | Realtime Database writes & atomic multi-path updates |
| **MongoDB Atlas (via `mongodb` driver)** | Analytics event store (dual-written with CSV) |
| **JSON Web Tokens (JWT)** | Admin authentication & route protection |
| **bcryptjs** | Admin password hashing |
| **Joi** | Environment variable validation at boot |
| **Jest + Supertest** | Unit & integration tests (9 tests, all passing) |
| **Render** | Cloud hosting with auto-deploy hooks |

### Database & Cloud
| Technology | Purpose |
|---|---|
| **Firebase Realtime Database** | Live queue state (`queue/state`, `queue/tokens`) |
| **MongoDB Atlas** | Persistent analytics event log (`queue_events` collection) |
| **Firebase Cloud Functions** | Scheduled token expiry (cron every 5 min) |

### Data Mining / Analytics
| Technology | Purpose |
|---|---|
| **Python 3.11** | Pipeline language |
| **pandas** | Data cleaning, preprocessing, aggregation |
| **scikit-learn** | Linear regression with cyclical hour encoding |
| **matplotlib** | Chart generation (6 charts in QueueLess style) |
| **Jupyter Notebook** | Academic report generation |
| **joblib** | Model serialization |

### DevOps & CI/CD
| Technology | Purpose |
|---|---|
| **GitHub Actions** | 3 CI workflows (backend tests, frontend build, analytics smoke test) |
| **Vercel** | Frontend auto-deploy on every push + preview URLs per PR |
| **Render** | Backend auto-deploy via deploy hook triggered from CI |
| **Dependabot** | Automated dependency security PRs |

---

## What's inside

```
queueless/
├── backend/                    # Node.js + Express REST API (deployed to Render)
│   ├── src/
│   │   ├── config/             # env validation, Firebase Admin init
│   │   ├── services/           # queue logic, auth, analytics dual-write
│   │   ├── controllers/        # thin HTTP handlers
│   │   ├── routes/             # auth, tokens (public), admin (JWT-protected)
│   │   ├── middleware/         # JWT auth, validation, error handling
│   │   ├── app.js              # Express factory
│   │   └── server.js           # entry point with graceful shutdown
│   ├── tests/                  # Jest + Supertest smoke tests (9 tests, all passing)
│   ├── package.json
│   └── .env.example
│
├── frontend/                   # React + Vite + Tailwind (deployed to Vercel)
│   ├── src/
│   │   ├── pages/              # Home, TakeToken, MyToken, Lookup, AdminLogin,
│   │   │                       # AdminDashboard, AdminAnalytics, AdminReport
│   │   ├── components/         # Layout, StatusBadge, Stat
│   │   ├── hooks/              # useQueueState (Firebase live subscription)
│   │   ├── services/           # Axios API client with JWT injection
│   │   ├── context/            # AuthContext
│   │   └── firebase.js         # Client SDK init
│   ├── public/
│   │   ├── svg/                # QueueLess SVG brand assets (wordmark, favicon, lockup)
│   │   └── png/                # PNG variants of brand assets
│   ├── tailwind.config.js      # Custom QueueLess design tokens
│   ├── vercel.json             # SPA rewrites + security headers
│   ├── package.json
│   └── .env.example
│
├── firebase/                   # Cloud configuration
│   ├── database.rules.json     # Security rules (read-only for clients, server writes)
│   ├── firebase.json           # Project config
│   └── functions/              # Serverless Cloud Function for token expiry
│       ├── index.js            # Scheduled job, runs every 5 minutes
│       └── package.json
│
├── analytics/                  # Data Mining pipeline (Python)
│   ├── data_collection/
│   │   ├── data_simulator.py   # Synthetic events generator (bimodal demand, lognormal service)
│   │   ├── csv_writer.py       # Ad-hoc CSV writer
│   │   └── mongo_writer.py     # MongoDB Atlas connector
│   ├── data_cleaning/
│   │   └── preprocess.py       # Raw events → tokens DataFrame with derived columns
│   ├── analysis/
│   │   ├── waiting_time.py     # Descriptive statistics, grouped views
│   │   ├── peak_hours.py       # Frequency distribution, weekday × hour heatmap
│   │   ├── moving_average.py   # Rolling-average predictor with backtest
│   │   └── linear_regression.py # sklearn LinearRegression with cyclical hour encoding
│   ├── visualization/
│   │   └── charts.py           # Six matplotlib charts in QueueLess editorial style
│   ├── notebooks/
│   │   └── QueueLess_Analysis.ipynb   # Academic submission (auto-generated, fully executed)
│   ├── data/                   # CSV outputs + chart PNGs (regenerated by run_pipeline.py)
│   ├── models/                 # Serialized linear regression model
│   ├── requirements.txt
│   ├── run_pipeline.py         # End-to-end orchestrator
│   └── build_notebook.py       # Regenerates the notebook from modules
│
├── .github/workflows/
│   ├── backend-ci.yml          # Jest tests + Render deploy hook
│   ├── frontend-ci.yml         # Vite build verification (Vercel handles deploy)
│   └── analytics-ci.yml        # Python pipeline smoke test
│
└── README.md                   # This file
```

---

## Quick start

### 1. Backend — local development

```bash
cd backend
cp .env.example .env
# Fill in Firebase service-account credentials and a JWT_SECRET (64-byte hex).
# Generate a secret with:
#   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
npm install
npm test            # runs the Jest suite (9 tests, all green) — no real Firebase needed
npm run dev         # API live at http://localhost:4000
```

### 2. Frontend — local development

```bash
cd frontend
cp .env.example .env.local
# Fill in the public Firebase web-config (apiKey, databaseURL, etc.) and
# point VITE_API_BASE_URL at http://localhost:4000/api/v1
npm install
npm run dev         # UI live at http://localhost:5173
```

### 3. Data Mining pipeline — local execution

The DM project is fully self-contained — it does not need the backend running:

```bash
cd analytics
pip install -r requirements.txt
python run_pipeline.py            # simulator → preprocess → analytics → charts
jupyter notebook notebooks/QueueLess_Analysis.ipynb
```

If real backend data exists at `analytics/data/queue_events.csv`, the pipeline uses it.
Otherwise the simulator produces statistically realistic synthetic events.

---

## Cloud deployment

### Firebase

```bash
cd firebase
firebase login
firebase use <your-project-id>
firebase deploy --only database,functions
```

This pushes the security rules and the scheduled token-expiry Cloud Function. The function runs
every 5 minutes (Asia/Karachi timezone) — see `firebase/functions/index.js`.

### Render — Backend

1. Create a new Web Service on Render, connect the GitHub repo, set the root directory to `backend/`.
2. Build command: `npm ci`. Start command: `npm start`.
3. Add every variable from `backend/.env.example` as an environment variable in the Render dashboard.
4. Copy the deploy hook URL from Render → Settings → Deploy Hook.
5. Add it as `RENDER_DEPLOY_HOOK` in GitHub repo Secrets.

After this, every push to `main` triggers `.github/workflows/backend-ci.yml`, which runs the test
suite and (on green) calls the deploy hook.

### Vercel — Frontend

1. Import the repo into Vercel, set the root directory to `frontend/`.
2. Framework preset: Vite (auto-detected). Build command and output directory come from `vercel.json`.
3. Add every variable from `frontend/.env.example` to Vercel's Environment Variables.
4. That's it — Vercel auto-deploys every push to `main` and creates a preview URL for every PR.

---

## Architecture at a glance

```
                    ┌───────────────────────────┐
                    │   React frontend (Vercel) │
                    │   — public token UI       │
                    │   — admin dashboard       │
                    │   — analytics & report    │
                    └──────────┬──────┬─────────┘
                               │      │
              REST (JWT)       │      │  WebSocket subscribe
        for admin actions      │      │  for live queue state
                               ▼      ▼
                    ┌───────────────────────────┐
                    │  Node/Express (Render)    │◄──── JWT auth
                    │  — token issuance         │
                    │  — queue control          │
                    │  — DUAL-WRITE: every      │
                    │    event → MongoDB +      │
                    │    CSV simultaneously     │
                    └──────────┬──────────┬─────┘
                               │          │
                               ▼          ▼
        ┌─────────────────────────┐   ┌─────────────────────────┐
        │  Firebase Realtime DB   │   │  MongoDB Atlas          │
        │  — queue/state          │   │  — queue_events         │
        │  — queue/tokens         │   │  (+ CSV fallback)       │
        │  — admins (private)     │   │                         │
        └─────────────────────────┘   └────────────┬────────────┘
                    ▲                              │
                    │ scheduled cron               ▼
        ┌───────────┴─────────────┐   ┌─────────────────────────┐
        │  Firebase Cloud Func.   │   │  Python DM pipeline     │
        │  expireStaleTokens      │   │  pandas + scikit-learn  │
        │  every 5 minutes        │   │  + matplotlib           │
        └─────────────────────────┘   └─────────────────────────┘
```

---

## Cloud computing concepts demonstrated

| Concept | Where it lives |
|---|---|
| Cloud hosting | Vercel (frontend) + Render (backend) |
| Cloud database | Firebase Realtime Database + MongoDB Atlas |
| Real-time data sync | Firebase WebSocket listeners in `useQueueState` hook |
| REST API design | `backend/src/routes/` — versioned at `/api/v1/`, role-segregated |
| Authentication | JWT issued by `auth.service.js`, verified by `middleware/auth.js` |
| Role-based access control | `requireAdmin` middleware on all `/admin/*` routes |
| Serverless computing | `firebase/functions/index.js` — scheduled token expiry |
| CI/CD pipelines | `.github/workflows/` — automated tests + auto-deploy |
| Security rules | `firebase/database.rules.json` — clients read-only, server writes |
| Analytics pipeline | Admin Analytics + Generate Report pages with live MongoDB reads |

## Data mining concepts demonstrated

| Concept | Where it lives |
|---|---|
| Structured data collection | Backend dual-write (MongoDB + CSV) + `data_simulator.py` |
| Data cleaning & preprocessing | `data_cleaning/preprocess.py` — type coercion, outlier flagging, pivoting |
| Aggregation / groupby | `analysis/waiting_time.py`, `analysis/peak_hours.py` |
| Frequency distribution | Hourly volume bar chart, queue-length histogram |
| Trend analysis | Daily mean wait line chart |
| Linear regression | `analysis/linear_regression.py` — sklearn with cyclical hour encoding |
| Moving-average predictor | `analysis/moving_average.py` — with proper backtest (no leakage) |
| Model serialization | joblib in `analysis/linear_regression.py` |
| Visualization | `visualization/charts.py` — six matplotlib charts |
| Live in-browser analytics | `AdminAnalytics.jsx` — peak hours chart, drop-off rate, staffing recommendation |
| Interactive report generation | `AdminReport.jsx` — dynamic heatmap + AI suggestions + print-to-PDF |
| Reproducible report | `notebooks/QueueLess_Analysis.ipynb` — auto-generated by `build_notebook.py` |

---

## Verified working

- **Backend tests:** 9/9 Jest tests pass (`cd backend && npm test`)
- **Frontend build:** `cd frontend && npm run build` produces a clean production bundle
- **Analytics pipeline:** `cd analytics && python run_pipeline.py` generates 6 charts and trains
  the linear regression model end-to-end. The notebook executes cleanly start to finish.
- **Live deployments:** Frontend on [queueless-liart.vercel.app](https://queueless-liart.vercel.app) · Backend on Render

---

*QueueLess · Spring 2026 · Bahria University Karachi Campus*
