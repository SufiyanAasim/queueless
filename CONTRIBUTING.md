# Contributing to QueueLess

Thank you for considering a contribution. This guide covers the workflow,
conventions, and quality bar for changes to QueueLess.

## Getting started

1. Fork and clone the repository.
2. Follow [RUNNING.md](RUNNING.md) to set up Firebase, the backend, the
   frontend, and (optionally) the analytics pipeline.
3. Verify your environment before changing anything:

```bash
cd backend && npm test          # 48 integration tests, no Firebase needed
cd ../frontend && npm run build # production build must pass
```

## Project layout

QueueLess is a monorepo with independently deployed modules:

| Directory    | What it is                              | Deploys to |
|--------------|------------------------------------------|------------|
| `frontend/`  | React + Vite SPA                         | Vercel     |
| `backend/`   | Express REST API                         | Render     |
| `firebase/`  | RTDB security rules + Cloud Functions    | Firebase   |
| `analytics/` | Python data-mining / ML pipeline         | CI artifact |
| `docs/`      | Architecture, API, deployment, guides    | —          |

Keep changes scoped to one module per PR whenever practical — CI is
path-filtered and each module deploys independently.

## Branch naming

```
feature/<short-name>     new functionality        feature/queue-transfer
bugfix/<short-name>      bug fixes                bugfix/token-expiry
refactor/<short-name>    no behaviour change      refactor/auth
docs/<short-name>        documentation only       docs/api-reference
test/<short-name>        tests only               test/messaging
ci/<short-name>          workflows / pipelines    ci/github-actions
perf/<short-name>        performance              perf/analytics-cache
security/<short-name>    security hardening       security/rate-limits
hotfix/<short-name>      urgent production fix    hotfix/login
release/vX.Y.Z           release stabilisation    release/v1.7.0
```

## Commit convention

Use [Conventional Commits](https://www.conventionalcommits.org):

```
feat(queue): add counter-to-counter token transfer
fix(api): resolve 404 on /admin/queues/overview
docs(readme): document LAN access
perf(analytics): cache traffic stats for 30s
ci(actions): add lint workflow
test(messaging): cover membership checks
chore(deps): bump firebase-admin to v14
```

Rules:

- Lower-case type, optional scope in parentheses, imperative description.
- One logical change per commit; keep unrelated churn out.
- Reference issues in the body (`Refs #12`, `Closes #34`).

## Pull requests

- Title follows the same convention as commits (`feat(auth): implement PIN lockout`).
- Fill in the PR template — summary, changes, testing, screenshots for UI.
- All checks must pass: backend tests, frontend build, analytics pipeline.
- UI changes must be verified in **both light and dark mode**.
- New endpoints need a test in `backend/tests/` and a row in
  [docs/API.md](docs/API.md).

## Code style

- Match the surrounding code — naming, comment density, structure.
- Frontend: functional React components, Tailwind utility classes, design
  tokens (`bg-paper`, `text-ink`, `border-rule`, …) instead of raw colours.
- Backend: services hold logic, controllers stay thin, routes declare
  auth middleware explicitly. Validation with Joi at the edge.
- No secrets in code — configuration goes through `.env` (see
  `.env.example` in each module).

## Quality bar

- Never fabricate data in user-facing analytics or AI responses — every
  number must trace to a real source (this is a hard project rule).
- Keep the free-tier constraints: Firebase Spark plan (no Cloud Storage),
  Render free tier (cold starts), Vercel hobby.
- Accessibility: keyboard reachable, labelled controls, sufficient contrast.

## Release process

See [RELEASE.md](RELEASE.md) for versioning, codenames, tagging, and the
release checklist.
