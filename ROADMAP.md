# Roadmap

Planned direction after **v1.7.0 "Cosmos"**. Order and scope may change;
items graduate into GitHub milestones when work begins.

## Near term

- **LAN QR codes** — display-board QR codes that encode the LAN IP
  automatically (base LAN access shipped in Cosmos).
- **Per-queue analytics depth** — day/week/month trend views per counter,
  exportable per-queue reports.
- **Notification preferences** — per-user mute/category controls in the
  Notification Center.

## Mid term

- **PWA / offline resilience** — installable app, offline token view,
  reconnect handling for spotty networks.
- **Multi-organisation support** — one deployment serving multiple
  branches/orgs with isolated queues, staff, and analytics.
- **Deeper ML** — arrival forecasting surfaced on the dashboard,
  anomaly alerts wired into the Notification Center.
- **Localisation** — Urdu and other language packs for customer-facing
  screens.

## Long term

- **Native mobile companion** (customer token tracking + staff calling).
- **Plugin surface** — webhooks + provider abstraction for notifications
  (SMS/WhatsApp) alongside the existing AI-provider abstraction.
- **SLA analytics** — per-service SLA compliance reporting over time.
- **Automated frontend test suite** (component + E2E).

## Completed (recent)

- ✅ LAN connectivity, interactive UI pass, session expiry, dark-mode
  fixes, professional repo structure (Cosmos)
- ✅ Industry-aware analytics, docked message tray, credits overhaul
  (Orion → Aurora)
- ✅ AI assistant with RAG + provider abstraction (Zenith)
- ✅ Internal messaging, notifications, shared files, RBAC, audit log
  (Zenith)
- ✅ Token referral, custom queues, predictive insights (Polaris)
