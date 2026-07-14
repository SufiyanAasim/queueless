# Admin guide

Sign in at `/admin/login`. Sessions expire automatically (default 8 h) —
you'll be returned to the login screen with a notice.

## First-time setup (`/admin/setup`)

Organisation name, **city** (dropdown + custom), Industry Type (sets the
default queues), display-board welcome message, SLA wait target, and the
daily auto-reset time (clock picker). Saving updates the status bar
immediately.

## Dashboard (`/admin`)

- Per-counter columns: now serving (with live "serving for" timer),
  **Next in Queue** indicator, waiting list with priority/referred badges.
- **Call Next** per counter, **Call Next Priority** across counters,
  **⊘ No-show / Skip**, and **Refer to another counter →** (transfers the
  live token — it keeps its number and gets priority at the destination).
- Global pause/resume/reset, per-service pause, live announcements,
  token lookup with inline notes, SLA overdue alerts (click through to
  Analytics), ML **Auto Mode**.
- Metric tiles deep-link into Analytics.

## Queues (`/admin/queues`)

Create/edit/disable/archive/delete custom queues (delete is blocked while
tokens are active). Per queue: token prefix, capacity, average service
time, working hours (clock pickers), staff assignment, live analytics,
and a shareable snapshot (link + QR).

## Analytics (`/admin/analytics`)

Live data (auto-refresh 30 s) filtered to your current Industry Type /
custom queues — counters with no activity don't clutter the charts.
Includes Smart Staffing recommendations, staff performance, predictive
insights (trained ML with heuristic fallback), and the enriched CSV export
(token numbers, serving counter, organisation name).

## Team & accounts

- **Staff** (`/admin/staff`): create staff with service + optional kiosk
  PIN; presence dots show who's online.
- **Admins** (`/admin/manage`): create Admin or Manager accounts;
  superadmins can change roles inline. Managers run operations but cannot
  manage accounts.
- **Activity** (`/admin/audit`): append-only audit trail of sensitive
  actions.

## Workspace tools

- **✦ AI Assistant** — floating button (bottom-left) or full workspace
  under the ADMIN ▾ menu. Answers only from live queue data.
- **💬 Messaging** — docked tray (bottom-right): 1:1 and group chats,
  reactions, read receipts, small attachments. Panels close automatically
  when you switch screens.
- **🔔 Notifications** — header bell + full screen (`/notifications`).
- **📁 Shared files** (`/files`) — drag-and-drop ≤ 2 MB.
