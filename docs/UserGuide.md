# Customer guide

No app install — everything runs in the browser.

## Take a token (`/take`)

1. Pick a service — each card shows the live waiting count and estimated
   wait (computed from real observed service times, not a fixed number).
2. Optionally: your name, priority request (elderly / medical / VIP),
   group size (1–5), and an email for a tracking link.
3. Tap **Issue my token** — you get a token number instantly.

## Track your token (`/token/:id`)

- Live position, people ahead, and ETA — updates in real time.
- Browser notifications at **position 2** ("almost up") and
  **position 1** ("you're next"), even in background tabs.
- Confetti + sound when your number is called.
- If your token expires, **re-queue** it within 2 hours.
- If staff refer you to another counter, your token follows you
  automatically — same number, priority at the new counter.

## Other screens

| Screen | Purpose |
|--------|---------|
| `/` | Home + QR code to join the queue |
| `/book` | Pre-book an appointment (auto-converts to a priority token at slot time) |
| `/lookup` | Recover a token by ID |
| `/history` | Every token taken on this device |
| `/display` | TV display board (now serving, per counter) |
| `/feedback/:tokenId` | Rate your visit after being served |
| `/credits` | About the developer |
