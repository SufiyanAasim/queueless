# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 1.7.x   | ✅        |
| 1.6.x   | ✅        |
| 1.5.x   | ✅        |
| 1.4.x   | ⚠️ Critical fixes only |
| < 1.4   | ❌        |

## Reporting a vulnerability

**Please do not open public issues for security vulnerabilities.**

Report privately via either channel:

- GitHub: [Private vulnerability report](https://github.com/SufiyanAasim/queueless/security/advisories/new)
- Email: <sufiyanaasim@outlook.com> with subject `SECURITY: QueueLess`

Include: affected area (frontend / backend / Firebase rules / CI), steps to
reproduce, impact assessment, and any suggested fix. You can expect an
acknowledgement within 72 hours and a status update within 7 days.

## Scope

In scope:

- Authentication / authorization bypass (JWT, RBAC roles, membership checks)
- Firebase security-rule weaknesses (data readable/writable that should not be)
- Injection (NoSQL, XSS, header), rate-limit bypass, CSRF
- Secrets exposure in code, builds, or CI logs

Out of scope:

- Denial of service against the free-tier hosting itself
- Issues requiring physical access to a kiosk device
- Social engineering

## Security design notes

- Clients are **read-only** on Firebase RTDB; all writes go through the
  JWT-protected Express API using the Admin SDK.
- Message, notification, and file **content** is served only via the API
  after server-side membership checks; RTDB carries content-free
  "signal" nodes for real-time refresh.
- Passwords and PINs are bcrypt-hashed; login and token issuance are
  rate-limited; the AI assistant is rate-limited per user.
- Sensitive admin actions are recorded in an append-only audit log.
