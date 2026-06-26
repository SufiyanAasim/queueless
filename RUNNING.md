# Running QueueLess Locally

This guide walks you through running every part of the stack on your own machine.

**Prerequisites:** Node.js 20+, Python 3.11+, a Firebase project (Realtime Database enabled), npm

---

## Table of Contents

1. [Firebase Setup](#1-firebase-setup)
2. [Backend](#2-backend)
3. [Frontend](#3-frontend)
4. [Analytics Pipeline](#4-analytics-pipeline)
5. [Cloud Functions (optional)](#5-cloud-functions-optional)
6. [Running Everything Together](#6-running-everything-together)
7. [Common Problems](#7-common-problems)

---

## 1. Firebase Setup

You need a Firebase project before anything else will work.

### Create a project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project**
2. Give it a name (e.g. `queueless-dev`) — disable Google Analytics if prompted
3. Once created, go to **Build → Realtime Database → Create database**
4. Choose **Start in test mode** for local dev (you can tighten rules later)
5. Pick the closest region (Singapore = `asia-southeast1`)

### Get the backend service account key

1. Firebase Console → **Project Settings** (gear icon) → **Service accounts**
2. Click **Generate new private key** → **Generate key** → downloads a JSON file
3. You'll copy values from this JSON into your backend `.env` (see step 2 below)

> **Security:** Never commit this JSON file or paste its private key anywhere public.

### Get the frontend web config

1. Firebase Console → **Project Settings** → **General** → scroll to **Your apps**
2. Click **Add app** → Web (`</>`) → give it a nickname → **Register app**
3. Copy the `firebaseConfig` object — you'll paste its values into `frontend/.env.local`

---

## 2. Backend

### Environment setup

```bash
cd backend
cp .env.example .env
```

Open `.env` and fill in these values:

| Variable | Where to get it |
|---|---|
| `JWT_SECRET` | Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `ADMIN_USERNAME` | Choose any username (e.g. `admin`) |
| `ADMIN_PASSWORD` | Choose a strong password |
| `FIREBASE_PROJECT_ID` | From service account JSON: `project_id` |
| `FIREBASE_CLIENT_EMAIL` | From service account JSON: `client_email` |
| `FIREBASE_PRIVATE_KEY` | From service account JSON: `private_key` — keep the `\n` escape sequences, wrap in double quotes |
| `FIREBASE_DATABASE_URL` | Firebase Console → Realtime Database → copy the URL (ends in `.firebasedatabase.app`) |

Leave `ANALYTICS_SINK=csv` for local dev — events will be written to `analytics/data/queue_events.csv`.

### Install and run

```bash
npm install

# Run tests first (no Firebase connection needed — tests use mocks)
npm test

# Start the dev server with auto-reload
npm run dev
```

The API is now live at **http://localhost:4000**

To verify it's running:
```
GET http://localhost:4000/api/v1/health
→ { "status": "ok" }
```

---

## 3. Frontend

### Environment setup

```bash
cd frontend
cp .env.example .env.local
```

Open `.env.local` and fill in:

| Variable | Value |
|---|---|
| `VITE_API_BASE_URL` | `http://localhost:4000/api/v1` |
| `VITE_FIREBASE_API_KEY` | From the web config `firebaseConfig.apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `firebaseConfig.authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `firebaseConfig.projectId` |
| `VITE_FIREBASE_DATABASE_URL` | `firebaseConfig.databaseURL` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `firebaseConfig.storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `firebaseConfig.messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `firebaseConfig.appId` |

### Install and run

```bash
npm install
npm run dev
```

The UI is now live at **http://localhost:5173**

### Other commands

```bash
npm run build      # production build → dist/
npm run preview    # serve the production build locally (port 4173)
```

---

## 4. Analytics Pipeline

The pipeline is fully self-contained — it does **not** need the backend running.

### Install dependencies

```bash
cd analytics
pip install -r requirements.txt
```

### Run with synthetic data (no backend needed)

```bash
# Generate realistic synthetic queue events
python data_collection/data_simulator.py

# Run the full pipeline: preprocess → analyse → charts → train model → build notebook
python run_pipeline.py
```

### Run with real backend data

If the backend has been running with `ANALYTICS_SINK=csv`, events are written to `analytics/data/queue_events.csv` (now including the serving counter `staff_username` and `org_name` columns). Skip the simulator step and run:

```bash
python run_pipeline.py
```

### Train the prediction artefact (consumed by the backend)

The backend's predictive insights load a compact `predictions.json` artefact. Regenerate it from the latest events with:

```bash
python models/train_predictor.py
# Trains GradientBoosting (service time) + IsolationForest (anomalies) + seasonal arrivals
# → analytics/models/predictions.json  (backend falls back to heuristics if absent)
```

### What gets generated

| Output | Path |
|---|---|
| Processed data | `analytics/data/` |
| 6 charts (PNG) | `analytics/data/*.png` |
| Trained regression model | `analytics/models/linreg_wait_predictor.joblib` |
| Prediction artefact (consumed by the backend) | `analytics/models/predictions.json` |
| Jupyter notebook | `analytics/notebooks/QueueLess_Analysis.ipynb` |

### Open the notebook

```bash
jupyter notebook analytics/notebooks/QueueLess_Analysis.ipynb
```

Or use VS Code with the Jupyter extension — open the `.ipynb` file directly.

---

## 5. Cloud Functions (optional)

The Cloud Function expires stale tokens every 5 minutes. For local dev the backend's built-in expiry sweeper handles this, so deploying Firebase Functions is optional.

If you want to deploy them:

```bash
npm install -g firebase-tools

cd firebase
firebase login
firebase use <your-project-id>

# Install function dependencies
cd functions
npm install
cd ..

# Deploy rules + functions
firebase deploy --only database,functions
```

> Requires the Firebase Blaze (pay-as-you-go) plan for Cloud Functions. The function is lightweight and stays within the free invocation quota.

---

## 6. Running Everything Together

Open three terminal windows:

**Terminal 1 — Backend**
```bash
cd backend
npm run dev
# Running on http://localhost:4000
```

**Terminal 2 — Frontend**
```bash
cd frontend
npm run dev
# Running on http://localhost:5173
```

**Terminal 3 — Analytics (one-off, not a server)**
```bash
cd analytics
python run_pipeline.py
# Generates charts + notebook, then exits
```

### Access points

| URL | What it is |
|---|---|
| `http://localhost:5173` | Customer-facing home page |
| `http://localhost:5173/take` | Take a token |
| `http://localhost:5173/display` | TV display board (fullscreen) |
| `http://localhost:5173/admin/login` | Admin login |
| `http://localhost:5173/staff/login` | Staff login |
| `http://localhost:5173/kiosk` | PIN kiosk (fullscreen) |
| `http://localhost:4000/api/v1/health` | Backend health check |

---

## 7. Common Problems

### Backend won't start — `FIREBASE_PRIVATE_KEY` error
The private key must be wrapped in double quotes in `.env` and the literal `\n` characters must stay as `\n` (not real newlines):
```
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

### Frontend shows "Network Error" on API calls
Make sure the backend is running on port 4000 and `VITE_API_BASE_URL=http://localhost:4000/api/v1` is set in `frontend/.env.local`. Restart `npm run dev` after editing `.env.local`.

### Firebase real-time data not loading
Check that `VITE_FIREBASE_DATABASE_URL` is set and matches the URL shown in Firebase Console → Realtime Database. It must include the region suffix (e.g. `.asia-southeast1.firebasedatabase.app`).

### Backend test failures
Tests mock Firebase — they do not need a real connection. If tests fail, ensure no `.env` values are malformed. Run `npm test -- --verbose` to see which test is failing.

### Analytics `ModuleNotFoundError`
Make sure you're in the `analytics/` directory and installed with `pip install -r requirements.txt`. If using a virtual environment, activate it first:
```bash
python -m venv venv
venv\Scripts\activate      # Windows
source venv/bin/activate   # macOS / Linux
pip install -r requirements.txt
```

### Port already in use
- Backend: change `PORT=4000` in `backend/.env` to another port, and update `VITE_API_BASE_URL` in `frontend/.env.local` to match
- Frontend: Vite will auto-pick the next available port (5174, 5175, …) and print the actual URL in the terminal
