# API reference

Base URL: `/api/v1` · Auth: `Authorization: Bearer <JWT>` unless marked
public. Errors return `{ "error": "<message>" }` with a proper status code
(400 validation, 401 unauthenticated, 403 forbidden, 404 not found,
409 conflict, 410 expired, 423 locked, 429 rate-limited).

Auth tiers: **public** · **staff** (staff or any admin tier) ·
**admin** (manager+) · **superadmin**.

## Health & config

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | public | Liveness probe |
| GET | `/config` | public | Org config + active custom queues + live `avgServiceSeconds` |
| GET | `/announcement` | public | Current broadcast banner |

## Tokens (customer)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/tokens` | public (rate-limited 10/min) | Issue token — `{service, email?, priority?, groupSize?, patientName?}` |
| GET | `/tokens/:id` | public | Live status: position, ETA, queue state |
| POST | `/tokens/:id/requeue` | public | Re-issue an expired token (≤ 2 h) |
| POST | `/appointments` | public | Book appointment `{name, service, date, timeSlot}` |
| POST | `/feedback` | public | Rate a served token `{tokenId, rating, comment?}` |

## Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/login` | public (rate-limited 20/15 min) | Admin login → JWT (8 h) |
| POST | `/staff/login` | public (rate-limited) | Staff login → JWT |
| POST | `/staff/login/pin` | public (rate-limited) | Kiosk PIN login → JWT (12 h) |

## Queue control (admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/queue` | Full live queue state |
| POST | `/admin/queue/call-next` | `{service, staffUsername?}` |
| POST | `/admin/queue/call-next-priority` | Next priority token across services |
| POST | `/admin/queue/skip/:tokenId` | Mark no-show |
| POST | `/admin/queue/refer/:tokenId` | Transfer to another counter `{toService, reason?}` |
| POST | `/admin/queue/pause` · `/resume` · `/reset` | Global queue control |
| POST | `/admin/queue/pause-service` · `/resume-service` | `{service}` |
| PUT  | `/admin/queue/tokens/:tokenId/note` | Attach note |
| POST | `/admin/auto-mode/start` · `/stop` · GET `/admin/auto-mode` | ML auto-call |
| PUT/DELETE | `/admin/announcement` | Set / clear broadcast |

## Custom queues (admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/queues` | List (incl. archived) |
| GET | `/admin/queues/overview` | Live cards: waiting, serving, est. wait |
| POST | `/admin/queues` | Create `{label, prefix?, capacity?, avgServiceSeconds?, workingHours?}` |
| GET/PUT | `/admin/queues/:id` | Fetch / edit |
| PUT | `/admin/queues/:id/enabled` · `/archive` | Toggle / archive |
| DELETE | `/admin/queues/:id` | Delete (blocked while active tokens exist) |
| PUT | `/admin/queues/reorder` | `{orderedIds[]}` |
| GET | `/admin/queues/:id/staff` · `/analytics` | Assigned staff / per-queue stats |

## Staff portal

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/staff/queue` | Live queue state |
| POST | `/staff/queue/call-next` | Call next for assigned service |
| POST | `/staff/queue/refer/:tokenId` | Transfer `{toService, reason?}` |
| PUT | `/staff/queue/tokens/:tokenId/note` | Attach note |
| GET/PUT | `/staff/profile` · POST `/staff/change-password` | Account |

## Analytics & ML (admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/analytics` | Traffic stats: peaks, distribution, trend, drop-off |
| GET | `/admin/analytics/staff` | Per-staff performance (Mongo aggregation) |
| GET | `/admin/analytics/export` | Enriched CSV (token #, counter, org name) |
| GET | `/admin/predictions` | Wait forecasts, congestion alerts, recommendations |
| GET | `/admin/audit` | Append-only audit log (last 200) |

## Accounts & RBAC

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/staff` · POST · DELETE `/admin/staff/:username` | admin | Staff CRUD |
| PUT | `/admin/staff/:username/service` | admin | Assign to queue |
| GET | `/admin/admins` | admin | List admin accounts |
| POST | `/admin/admins` | admin+ | Create `{username, password, displayName?, role: admin\|manager}` |
| PUT | `/admin/admins/:username/role` | superadmin | Change role |
| DELETE | `/admin/admins/:username` | admin+ | Delete (superadmin protected) |
| GET/PUT | `/admin/profile` · POST `/admin/change-password` | admin | Own account |
| GET/PUT | `/admin/config` | admin | Org settings |

## AI assistant (staff)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/assistant` (rate-limited 20/min/user) | Ask `{question, history?, conversationId?}` → grounded answer |
| GET/POST | `/assistant/conversations` | List / create saved chats |
| GET/PUT/DELETE | `/assistant/conversations/:id` | Fetch / rename+pin / delete |

## Messaging & notifications (staff)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/directory` | Team directory (admins + staff, presence) |
| GET/POST | `/conversations` | List / create (direct or group) |
| GET/POST | `/conversations/:id/messages` | History / send `{text?, attachment?≤256 kB}` |
| PUT | `/conversations/:id/read` | Read receipt |
| PUT | `/conversations/:id/messages/:mid/react` | Toggle emoji `{emoji}` |
| GET | `/notifications` | `{items[], unread}` |
| PUT | `/notifications/:id/read` · `/notifications/read-all` | Mark read |

## Sharing & files (staff)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST/GET | `/shares` · DELETE `/shares/:id` | staff | Capability links (expiring, revocable) |
| GET | `/share/:id` | public | Read-only snapshot (the random id is the secret) |
| POST/GET | `/uploads` | staff | Shared files ≤ 2 MB (images, PDF, CSV, XLSX, DOCX, ZIP) |
| GET/DELETE | `/uploads/:id` | staff | Download / delete (uploader only) |
