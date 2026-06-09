# UKSC v2 — Telegram → AI → Shopify pipeline

UK Stylish Club product onboarder. A Node.js app on Fly.io that:

1. **Silently** reads my personal Telegram for vendor product photos (vendors never notice anything — strictly read-only toward them)
2. Analyses them with the **Anthropic Message Batches API** (cheap, async, every 15 min, model `claude-haiku-4-5`)
3. Lets me **review / price / publish** to Shopify from a mobile PWA
4. Notifies **only me**, via my own Telegram **Saved Messages**

```
Telegram photos ──┐
                  ├─► resize → hash → dedupe → batch analysis → review queue ─► Shopify
Gallery uploads ──┘                                 │
                                         Saved Messages digests
```

> **⚠️ Branch transplant note:** this app was built on the `claude/uksc-v2-pipeline-c2e2zq`
> branch of `hello-world` because the build session couldn't push to `uksc-onboarder`.
> To move it there as `v2-pipeline`, run this in any Codespace:
>
> ```bash
> git clone https://github.com/BilalzDeveloper/uksc-onboarder.git && cd uksc-onboarder
> git fetch https://github.com/BilalzDeveloper/hello-world.git claude/uksc-v2-pipeline-c2e2zq
> git checkout -b v2-pipeline FETCH_HEAD && git push -u origin v2-pipeline
> ```

---

## 📱 PHONE-ONLY RUNBOOK (in order)

Everything below works from a phone browser: web dashboards + GitHub Codespaces as the only terminal.

### 1. Neon database (web)

1. Go to **[neon.tech](https://neon.tech)** → sign up → **Create project** (any region near you, e.g. London)
2. On the project dashboard, open **Connection Details** → copy the **connection string**
   (looks like `postgres://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`)
3. That's your `DATABASE_URL`. Tables are created automatically the first time the app boots — nothing else to do.

### 2. Telegram API credentials (web)

1. Go to **[my.telegram.org](https://my.telegram.org)** → log in with your phone number
2. **API development tools** → create an app (any name/short name)
3. Copy **api_id** and **api_hash**

### 3. Telegram login from Codespaces (phone browser)

1. Open this repo on github.com → **Code ▾ → Codespaces → Create codespace** on branch `v2-pipeline`
2. In the Codespace terminal:
   ```bash
   npm install
   node scripts/login.js
   ```
3. Enter api_id, api_hash, your phone number (`+44…`), the code Telegram sends you, and your 2FA password if you have one
4. Copy the long line between `COPY-THIS-START` and `COPY-THIS-END` — that's your `TELEGRAM_SESSION`. Keep it secret: it **is** your Telegram login.

### 4. Fly.io app + volume + secrets (web dashboard)

1. **[fly.io](https://fly.io)** → sign up → Dashboard → **Launch an app** → name it **`uksc`** (region: London)
   - If the dashboard insists on a repo/deploy step, skip/cancel after the app exists — GitHub Actions does the deploying.
2. App → **Volumes** → **Create volume**: name **`data`**, size **3 GB**, same region as the app
3. App → **Secrets** → add each of these:

   | Secret | Value |
   |---|---|
   | `DATABASE_URL` | from step 1 |
   | `TELEGRAM_API_ID` | from step 2 |
   | `TELEGRAM_API_HASH` | from step 2 |
   | `TELEGRAM_SESSION` | from step 3 |
   | `ANTHROPIC_KEY` | console.anthropic.com → API Keys |
   | `SHOPIFY_TOKEN` | Shopify admin → Settings → Apps → Develop apps → your app → API credentials (`shpat_…`) |
   | `SHOPIFY_DOMAIN` | `uk-stylish.myshopify.com` |
   | `APP_PASSWORD` | a strong password for the PWA login |
   | `PUBLISH_STATUS` | `ACTIVE` (or `DRAFT` to review in Shopify before going live) |

### 5. Deploy token → GitHub secret

1. Fly dashboard → **Tokens** (account or app level) → **Create deploy token** → copy it
2. GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**:
   name **`FLY_API_TOKEN`**, value = the token

### 6. Push → deploy → install

1. Push anything to `v2-pipeline` (or `main`) → the **Fly Deploy** Action builds and deploys
2. Open **https://uksc.fly.dev** → log in with `APP_PASSWORD`
3. Browser menu → **Add to Home Screen** → you now have the UKSC app icon

---

## Daily flow

1. Vendors send photos on Telegram (or you forward WhatsApp photos to **Saved Messages**, or upload from your gallery in the Inbox tab). A caption containing a vendor code (`#siim`, `ad`, …) assigns the vendor; otherwise the chat mapping is used; unknown chats show up under **⚠️ Unassigned** → map them once in Settings (or mark `IGNORE`).
2. Every 15 minutes the pipeline batches new photos to the AI. When a batch finishes you get a **Saved Messages digest**.
3. Open the app → **Review**: fix titles/types/colours, set prices (global, by type, or per product), or tap **Approve all high-conf** (auto-priced from your price rules).
4. Hit **🚀 GO** → watch the **Queue** tab. Publishing runs on the server — you can close the app. A "publish complete" digest lands in Saved Messages.

Testing tip: **Settings → ▶ Run pipeline now** triggers the 15-min cron immediately (also `POST /api/dev/run-pipeline`).

---

## TROUBLESHOOTING

**Userbot not connecting**
- Fly dashboard → app → **Live Logs**. Healthy boot logs `userbot connected as …`.
- `TELEGRAM_SESSION invalid/expired` → re-run `node scripts/login.js` in a Codespace and update the Fly secret. Logging out of Telegram on your phone (or "Terminate all sessions") kills the session string.
- No logs about the userbot at all → the `TELEGRAM_SESSION` secret is empty/missing (the app deliberately skips the userbot then).
- Telegram sometimes flags fresh sessions from datacenter IPs; if login succeeds but the connection drops, wait a few minutes — it reconnects forever, with logs.

**Neon / SSL errors**
- `DATABASE_URL` must be the **full** Neon string including `?sslmode=require`.
- `password authentication failed` → re-copy the string from Neon (Reset password on the Neon dashboard if needed).
- Neon free tier suspends idle DBs; the first query after a while takes a few seconds — the app retries bootstrap automatically on boot.
- `db bootstrap failed` repeating → check the hostname: it must be the **pooled** or direct Neon endpoint copied verbatim, no spaces.

**sharp build issues**
- In the Codespace: `npm rebuild sharp` (or delete `node_modules` and `npm install` again).
- In Docker/Fly this is already handled — the image installs `libvips42`. If a deploy fails on sharp, check the Action log for an apt error and re-run the job.
- Apple/ARM vs x64 mismatch errors locally → `npm install --os=linux --cpu=x64 sharp` inside the Codespace (Codespaces are x64 Linux).

**Batch polling**
- Batches usually finish well under an hour; the app polls every 30 s and the cron also re-checks every 15 min.
- If the server restarts mid-batch, state is saved on the `/data` volume and polling resumes on boot — nothing is lost.
- Photos stuck in `analysing` for 6+ hours are automatically re-queued on the next cycle.
- `ANTHROPIC_KEY not set` in logs → add the Fly secret; check console.anthropic.com → Usage if requests error.

**Publishing**
- A failed product shows ❌ in the Queue tab with the Shopify error. Fix the row in Review (it's back in state `failed` → edit and approve again) and GO again.
- `collection not found` warnings in logs → the collection title in `src/vendors.js` must match a collection that exists in Shopify admin.

---

## Stack / layout

| Path | What |
|---|---|
| `src/server.js` | Express: static PWA + JSON API, app-password auth (httpOnly cookie, rate-limited login) |
| `src/userbot.js` | GramJS on my personal account. READ-ONLY toward vendors; writes only to my Saved Messages |
| `src/pipeline.js` | resize (sharp, 800px q80) → SHA-256 dedupe → Message Batches (every 15 min) → review queue |
| `src/shopify-queue.js` | throttled (~1.5 r/s) publisher, 3 retries, DB-persisted, survives restarts |
| `src/vendors.js` | vendor codes + collection map (extracted from the old Drive-based `index.html`) |
| `src/db.js` | Neon Postgres via `pg`; schema bootstrap + price seed on boot |
| `scripts/login.js` | one-time Telegram login, prints the session string (Codespaces-safe) |
| `public/` | the PWA: dark UKSC UI, Inbox / Review / Queue / Settings, manifest + service worker |

Secrets live **only** in Fly secrets / local `.env` (gitignored). Nothing secret is ever served to the browser.
