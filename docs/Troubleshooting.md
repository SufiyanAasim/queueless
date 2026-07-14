# Troubleshooting

## `Route not found: GET /api/v1/admin/queues/overview` (or /audit, /conversations, /notifications, /uploads, /assistant)

The deployed **backend is older than the frontend**. These routes exist
from v1.4.5+; redeploy the Render backend. Verify with:

```bash
curl https://<backend>/api/v1/           # → { version: "1.7.0", ... }
```

## AI assistant says "could not reach the operational data"

Same root cause as above — the backend the frontend points at doesn't have
`/assistant`. Redeploy, or point `VITE_API_BASE_URL` at a current backend.

## Backend won't start — `FIREBASE_PRIVATE_KEY` error

Keep the literal `\n` sequences and wrap in double quotes:

```
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

## Frontend "Network Error" on API calls

Backend not running / wrong `VITE_API_BASE_URL` in `frontend/.env.local`.
Restart `npm run dev` after editing env files. On Render free tier the
first request after idle takes ~30 s (cold start) — this is expected.

## Firebase real-time data not loading

`VITE_FIREBASE_DATABASE_URL` must match the console URL exactly (including
region suffix). Also deploy the security rules:
`cd firebase && firebase deploy --only database`.

## npm / vite fails with `Cannot find module 'D:\...\vite.js'` on Windows

The repository path contains `&` or parentheses, which breaks npm's cmd
shims. Move the repo to a plain path, or run tools directly:

```bash
node node_modules/vite/bin/vite.js build
node node_modules/jest/bin/jest.js --runInBand
```

## Analytics charts show services from a different Industry Type

Fixed in v1.5.0 — charts filter to the current Industry Type / custom
queues. If you still see stale entries, hard-refresh so the cached config
(`localStorage.queueless.appConfig`) updates.

## Dark mode: unreadable text on dark cards

Fixed in v1.7.0 via global overrides in `frontend/src/index.css`
(`.dark .bg-ink [class*="text-paper"]`). If a new component regresses,
follow the same pattern — never hardcode light text on `bg-ink`.

## "Session expired" keeps appearing

JWTs last 8 h (admin) / 12 h (kiosk PIN). Adjust `JWT_EXPIRES_IN` in the
backend `.env` if you need longer sessions.

## Tests fail locally

Backend tests mock Firebase — no services needed. Ensure Node ≥ 20 and a
clean `npm install`. Run verbosely: `npm test -- --verbose`.

## LAN device can't reach the app

Bind Vite to all interfaces (`npm run dev:lan`), use the LAN IP in
`VITE_API_BASE_URL`, and add that origin to backend `CORS_ORIGIN`. See
[Development.md § LAN access](Development.md#lan-access-kiosk--display-board-on-another-device).
