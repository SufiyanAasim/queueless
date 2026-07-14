# Development guide

## Repository layout

This monorepo intentionally keeps deployable modules at the root (instead
of a single `src/`) because Vercel and Render deploy by *root directory* —
moving them would break both pipelines. Mapping to the conventional layout:

| Conventional | QueueLess equivalent |
|--------------|----------------------|
| `src/` | `frontend/src/`, `backend/src/`, `analytics/` |
| `tests/` | `backend/tests/` (Jest + Supertest, 48 tests) |
| `scripts/` | `scripts/` (module-branch publisher) |
| `config/` | `backend/src/config/`, `render.yaml`, `firebase/firebase.json` |
| `docs/` | `docs/` |

## Everyday commands

```bash
# Backend
cd backend
npm test                 # full integration suite (Firebase mocked)
npm run dev              # http://localhost:4000

# Frontend
cd frontend
npm run dev              # http://localhost:5173
npm run dev:lan          # dev server reachable on your LAN
npm run build            # production build

# Analytics
cd analytics
python run_pipeline.py                   # simulate → clean → analyse → charts
python models/train_predictor.py         # export predictions.json
```

> **Windows note:** if the repo path contains `&` or parentheses
> (e.g. `Fully Tested & Deployed`), npm's `.cmd` shims can break. Either
> keep the repo in a plain path, or invoke tools directly:
> `node node_modules/vite/bin/vite.js build`,
> `node node_modules/jest/bin/jest.js --runInBand`.

## LAN access (kiosk / display board on another device)

1. Start the frontend bound to all interfaces: `npm run dev:lan`
   (or add `server: { host: true }` to `vite.config.js`).
2. Start the backend normally — Express binds `0.0.0.0` by default.
3. On the LAN device, open `http://<your-LAN-IP>:5173`.
4. Set `VITE_API_BASE_URL=http://<your-LAN-IP>:4000/api/v1` in
   `frontend/.env.local` (localhost would point at the kiosk itself), and
   add that origin to the backend `CORS_ORIGIN`.

No extra code is required — the app is LAN-compatible out of the box once
the API base URL and CORS are LAN-aware.

## Conventions

- Branch naming, commit format, PR titles: see
  [CONTRIBUTING.md](../CONTRIBUTING.md).
- **File naming:** React components/pages `PascalCase.jsx`
  (`AdminDashboard.jsx`), hooks `useCamelCase.js`, services/utilities
  `camelCase.js` (`queueAdmin.service.js`), Python `snake_case.py`,
  docs `TitleCase.md` inside `docs/`, root community files `UPPERCASE.md`.
- Design tokens over raw colours (`bg-paper`, `text-ink`, `border-rule`);
  every screen must work in **light and dark mode** (dark remaps live in
  `frontend/src/index.css` — never hardcode light text on `bg-ink`).
- New API endpoints: Joi validation, explicit auth middleware, a Jest test,
  and a row in [API.md](API.md).
- Frontend API calls live in `frontend/src/services/api/*` (domain
  modules), re-exported through `services/api.js`.
- Real-time features follow the *signal node* pattern — never make content
  client-readable in RTDB (see [Architecture.md](Architecture.md)).

## Testing

- Backend: `backend/tests/queue.test.js` mocks the Firebase layer
  in-memory, so the suite runs with **no external services**. Cover the
  happy path and the failure path (401/403/404/400) for every new route.
- Frontend: the production build is the gate; verify UI flows manually in
  both themes.
- Analytics: `run_pipeline.py --days 5 --skip-charts` is the CI smoke test.
