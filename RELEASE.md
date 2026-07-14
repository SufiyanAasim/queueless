# Release Process

How QueueLess versions, names, tags, and ships releases.

## Semantic versioning

`MAJOR.MINOR.PATCH` — e.g. `1.6.5`

| Part  | Bump when |
|-------|-----------|
| MAJOR | Breaking changes (API contracts, data schema, auth model) |
| MINOR | New functionality, backward compatible |
| PATCH | Bug fixes only |

## Release naming

Format: **vX.Y.Z · Codename — Milestone**

- **Codenames** follow a single theme: **space** (never mix themes).
- **Milestones** are one word (exception: historical
  "Intelligent Collaboration").

| Version | Codename | Milestone |
|---------|----------|-----------|
| v1.2.0  | Nova     | Sight     |
| v1.2.5  | Comet    | Alive     |
| v1.3.0  | Eclipse  | Crew      |
| v1.3.5  | Nebula   | Pulse     |
| v1.4.0  | Polaris  | Relay     |
| v1.4.5  | Zenith   | Intelligent Collaboration |
| v1.5.0  | Orion    | Beacon    |
| v1.5.5  | Pulsar   | Insight   |
| v1.6.0  | Quasar   | Forge     |
| v1.6.5  | Aurora   | Summit    |
| v1.7.0  | Cosmos   | LAN Connectivity & UI Polish |

Reserved future codenames: Atlas, Helios, Lyra, Vega, Sirius.

Display format for release titles:

```
🚀 QueueLess v1.7.0
Codename: Cosmos — LAN Connectivity & UI Polish
```

## Git tags

Annotated tags in the form `vX.Y.Z` only (`v1.7.0`). Never `latest`,
`release1`, `vFinal`, or build-suffixed tags.

```bash
git tag -a v1.7.0 -m "QueueLess v1.7.0 — Cosmos (LAN Connectivity & UI Polish)"
git push origin v1.7.0
```

## Branch strategy

```
feature/* ─┐
bugfix/*  ─┼─▶ develop ─▶ release/vX.Y.Z ─▶ main ─▶ (tag vX.Y.Z)
docs/*    ─┘                                   ▲
                                    hotfix/* ──┘
```

- `main` is always deployable; Vercel/Render deploy from it.
- `release/vX.Y.Z` freezes scope — only fixes and docs land there.
- `hotfix/*` branches from `main`, merges back to both `main` and `develop`.

## Release checklist

1. All CI green: backend tests, frontend build, analytics pipeline.
2. Version bumped in `frontend/package.json`, `backend/package.json`,
   `backend/src/app.js`, footer (`Layout.jsx`), and Credits page.
3. `CHANGELOG.md` updated ([Keep a Changelog](https://keepachangelog.com)
   sections — Added / Changed / Improved / Fixed / Removed / Deprecated /
   Security / Documentation). Release notes ≠ changelog: full notes live in
   `docs/releases/vX.Y.Z.md`.
4. README release table updated; docs cross-checked.
5. Tag, push, publish the GitHub Release using the release-notes doc.
6. Verify production: Vercel build, Render deploy, Firebase rules current.

## Release cycle

Development → Alpha → Beta → RC → **Stable** → Patch → Maintenance
