# Deployment

Each module deploys independently. A frontend push never deploys backend
code and vice-versa (CI is path-filtered; hosts use `rootDir`).

## Frontend → Vercel

1. Import the repo → **Root Directory: `frontend`** (required — no root
   `package.json`).
2. Framework: Vite (auto-detected); `frontend/vercel.json` provides SPA
   rewrites.
3. Node 20 or 22.
4. Add all `VITE_*` variables from `frontend/.env.example`, with
   `VITE_API_BASE_URL` pointing at the Render backend
   (e.g. `https://<service>.onrender.com/api/v1`).

Every push to `main` touching `frontend/**` produces a production deploy;
PRs get preview URLs.

## Backend → Render

1. New Web Service → connect repo → **Root Directory: `backend`** (or use
   the `render.yaml` blueprint).
2. Build `npm ci`, start `node src/server.js` (from `render.yaml`).
3. Set secrets in the dashboard (everything `sync: false`):
   `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `FIREBASE_PROJECT_ID`,
   `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_DATABASE_URL`,
   `MONGO_URI` (if `ANALYTICS_SINK=mongo`), optional `SMTP_*`, optional
   `AI_PROVIDER`/`AI_API_KEY`.
4. `CORS_ORIGIN` must include the Vercel domain.
5. GitHub Actions triggers the deploy hook after tests pass — set the
   `RENDER_DEPLOY_HOOK` repo secret.

> ⚠️ **Deployment gap:** if the frontend shows `Route not found` for
> `/admin/queues/overview`, `/admin/audit`, `/conversations`, etc., the
> Render service is running an older backend than the frontend expects.
> Redeploy the backend.

## Firebase

```bash
cd firebase
firebase login
firebase use <project-id>
firebase deploy --only database          # security rules
firebase deploy --only functions         # optional (needs Blaze for functions)
```

Rules auto-deploy from CI on changes to `firebase/database.rules.json`
(set the `FIREBASE_SERVICE_ACCOUNT` repo secret). The app stays on the
free **Spark** plan — Cloud Storage is intentionally not used.

## Analytics / ML artefact

CI runs the pipeline on `analytics/**` changes. To refresh the trained
model consumed by the backend:

```bash
cd analytics
python models/train_predictor.py --out ../backend/models/predictions.json
```

Commit the regenerated `backend/models/predictions.json` so production
serves trained predictions (heuristic fallback otherwise).

## Environment variables

| Variable | Module | Required | Default | Description |
|----------|--------|----------|---------|-------------|
| `VITE_API_BASE_URL` | frontend | ✅ | — | Backend API base |
| `VITE_FIREBASE_*` (8 keys) | frontend | ✅ | — | Firebase web config (public by design) |
| `PORT` | backend | — | 4000 | Server port |
| `CORS_ORIGIN` | backend | ✅ | — | Comma-separated allowlist |
| `JWT_SECRET` | backend | ✅ | — | ≥ 32 chars |
| `JWT_EXPIRES_IN` | backend | — | 8h | Admin session length |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | backend | ✅ | — | Bootstrap superadmin |
| `FIREBASE_PROJECT_ID` / `CLIENT_EMAIL` / `PRIVATE_KEY` / `DATABASE_URL` | backend | ✅ | — | Admin SDK service account |
| `AVG_SERVICE_TIME_SECONDS` | backend | — | 180 | Wait-estimate fallback |
| `TOKEN_EXPIRY_SECONDS` | backend | — | 3600 | Token TTL |
| `ANALYTICS_SINK` | backend | — | csv | `csv` \| `mongo` |
| `ANALYTICS_CSV_PATH` | backend | — | ../analytics/data/queue_events.csv | Event log path |
| `ANALYTICS_MODEL_PATH` | backend | — | ../analytics/models/predictions.json | Trained artefact |
| `MONGO_URI` / `MONGO_DB` / `MONGO_COLLECTION` / `MONGO_TOKENS_COLLECTION` | backend | mongo mode | queueless / queue_events / tokens | Atlas analytics store |
| `SMTP_HOST` / `PORT` / `USER` / `PASS` / `FROM` | backend | — | — | Token emails (blank = disabled) |
| `FRONTEND_URL` | backend | — | localhost:5173 | Links in emails/shares |
| `AI_PROVIDER` | backend | — | grounded | grounded \| openai \| groq \| openrouter \| ollama \| gemini |
| `AI_API_KEY` / `AI_MODEL` / `AI_BASE_URL` | backend | LLM mode | — | Provider credentials |

GitHub Actions secrets: `RENDER_DEPLOY_HOOK`, `FIREBASE_SERVICE_ACCOUNT`.
