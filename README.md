# UKSC — Telegram → AI → Shopify pipeline (laptop edition)

UK Stylish Club product onboarder. A Node.js app you run on your laptop that:

1. **Silently** reads your personal Telegram for vendor product photos (read-only toward vendors — it never replies, reacts, or sends anything to a vendor chat)
2. Analyses them with the **Anthropic Message Batches API** (cheap, async, every 15 min, model `claude-haiku-4-5`)
3. Lets you **review / price / publish** to Shopify from a PWA at `http://localhost:3000`
4. Notifies **only you**, via your own Telegram **Saved Messages**

```
Telegram photos ──┐
                  ├─► resize → hash → dedupe → batch analysis → review queue ─► Shopify
Gallery uploads ──┘                                 │
                                         Saved Messages digests
```

> **Runs only while your laptop is on and awake.** The userbot ingests photos that
> arrive *after* it connects; messages sent while it's off aren't back-scanned.

---

## Quick start

You need [Node.js 20+](https://nodejs.org) and Git.

```bash
git clone -b claude/uksc-v2-pipeline-c2e2zq https://github.com/BilalzDeveloper/hello-world.git uksc
cd uksc
npm install
cp .env.example .env        # Windows: copy .env.example .env
```

Fill in `.env` (see the table below), then:

```bash
node scripts/login.js       # one-time Telegram login → prints TELEGRAM_SESSION
npm start                   # → open http://localhost:3000, log in with APP_PASSWORD
```

Phone on the same Wi-Fi can use it too: `http://<your-laptop-ip>:3000`.

### `.env` values

| Variable | Where it comes from |
|---|---|
| `DATABASE_URL` | [neon.tech](https://neon.tech) → your project → Connection Details (keep `?sslmode=require`) |
| `TELEGRAM_API_ID` / `TELEGRAM_API_HASH` | [my.telegram.org](https://my.telegram.org) → API development tools |
| `TELEGRAM_SESSION` | printed by `node scripts/login.js` (paste the whole COPY-THIS block) |
| `ANTHROPIC_KEY` | console.anthropic.com → API Keys |
| `SHOPIFY_CLIENT_ID` / `SHOPIFY_CLIENT_SECRET` | Shopify admin → Settings → Apps → Develop apps → "Build apps in Dev Dashboard" → your app → Settings → Credentials. (Legacy custom apps with a directly-revealed `shpat_…` token were retired by Shopify in Jan 2026 — the app now exchanges these for a short-lived access token itself.) |
| `SHOPIFY_DOMAIN` | `uk-stylish.myshopify.com` |
| `APP_PASSWORD` | anything — your PWA login password |
| `PUBLISH_STATUS` | `ACTIVE` (or `DRAFT` to stage products in Shopify before going live) |

Minimum to boot and log in: `DATABASE_URL` + `APP_PASSWORD`. The other secrets switch
their features on as you add them (Telegram ingest, AI analysis, Shopify publishing).

Tables are created automatically on first boot. Sanity-check the DB anytime with
`npm run db:check`.

---

## Daily flow

1. Vendors send photos on Telegram (or forward WhatsApp photos to your **Saved Messages**, or upload from your gallery in the Inbox tab). A caption with a vendor code (`#siim`, `ad`, …) assigns the vendor; otherwise the chat mapping is used; unknown chats appear under **⚠️ Unassigned** → map them once in Settings (or mark `IGNORE`).
2. Every 15 min the pipeline batches new photos to the AI. A **Saved Messages digest** lands when each batch finishes.
3. **Review** tab: fix titles/types/colours, set prices (global, by type, or per product), or tap **Approve all high-conf** (auto-priced from your price rules).
4. Hit **🚀 GO** → watch the **Queue** tab. Publishing runs server-side; a "publish complete" digest lands in Saved Messages.

Testing tip: **Settings → ▶ Run pipeline now** triggers the 15-min cron immediately.
Set `USERBOT_DEBUG=1 npm start` to log every Telegram message the userbot sees and why
it kept or skipped it.

---

## TROUBLESHOOTING

**Userbot not connecting / photos not appearing**
- Run with `USERBOT_DEBUG=1 npm start` and send yourself a test photo (Saved Messages, caption `#siim`). The `userbot[dbg]:` line tells you whether the message arrived and why it was kept or skipped.
- `userbot: TELEGRAM_SESSION not set — skipping` → `.env` not loaded (must be in the project root; line is `TELEGRAM_SESSION=…`, no quotes).
- `TELEGRAM_SESSION invalid/expired` → re-run `node scripts/login.js` (the string is long — easy to truncate on paste). Hitting "Terminate all other sessions" in Telegram or changing your password also invalidates it.
- Remember: only **new** photos are ingested, and they show in **Inbox** first (as "pending analysis") — they become products in **Review** only after the 15-min cron or "Run pipeline now".

**Neon / SSL errors**
- `DATABASE_URL` must be the full Neon string including `?sslmode=require`.
- Neon free tier suspends idle DBs; the first query after a while takes a few seconds — bootstrap retries automatically.

**sharp build issues**
- `npm rebuild sharp`, or delete `node_modules` and `npm install` again.

**Batch polling**
- Batches usually finish well under an hour; the app polls every 30 s. If you restart mid-batch, state is saved under `./data` and polling resumes on boot.

---

## Layout

| Path | What |
|---|---|
| `src/server.js` | Express: static PWA + JSON API, app-password auth |
| `src/userbot.js` | GramJS on your personal account. READ-ONLY toward vendors; only ever writes to your Saved Messages |
| `src/pipeline.js` | resize (sharp, 800px q80) → SHA-256 dedupe → Message Batches → review queue |
| `src/shopify-queue.js` | throttled (~1.5 r/s) publisher, 3 retries, DB-persisted, resumes on restart |
| `src/vendors.js` | vendor codes + collection map |
| `src/db.js` | Neon Postgres via `pg`; schema bootstrap + price seed on boot |
| `scripts/login.js` | one-time Telegram login → session string |
| `public/` | the PWA (dark/light UI, Inbox / Review / Queue / Settings) + `guide.html` |

Images are stored under `./data/` (the DB rows point at them). Secrets live only in
`.env` (gitignored) — nothing secret is ever served to the browser.
