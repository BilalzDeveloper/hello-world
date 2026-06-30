# UKSC Requirements & Enhancement Backlog

This file is the single source of truth for feature requests and enhancements
— so nothing discussed gets lost between sessions. Whenever you ask Claude for
something new, ask it to also add an entry here. Whenever something ships,
ask it to flip the status.

## How to use this

- **Find it:** it's `REQUIREMENTS.md` at the repo root — open it in your IDE like any other file.
- **Read it:** scan the status marks. `📋 Planned` = agreed but not built. `💡 Idea` = mentioned but not scoped/agreed yet. `✅ Done` = shipped.
- **Update it yourself:** edit directly, same as any file — it's just markdown, and it's tracked in git so old entries are never truly lost (`git log -p REQUIREMENTS.md` shows the full history).
- **Update it via Claude:** say "add this to REQUIREMENTS.md" when you make a request, or "mark X done" once something ships. Start a new session by saying "check REQUIREMENTS.md for open items" if you want a recap.
- **Source of old requirements:** the original PWA at `public/index.html` already implements several things the new console (`console/`) doesn't have yet — full multi-field editing, merge, split. That file is itself a working reference for exact behavior when porting a feature across.

---

## Listing review

- ✅ Real data wiring (real `review_queue` via `/api/review`, replacing mock listings)
- ✅ Editable Collection field (LOV picker) + admin collection-mapping page (Settings)
- ✅ Editable Sell price (required to publish)
- ✅ **Bigger/better photo viewing** — lightbox with prev/next + keyboard nav (2026-06-29)
- ✅ **Full content editing** — title, sizes, colours, notes now editable inline, save-on-blur via existing PATCH API (2026-06-29)
- ✅ **Merge listings** — per-card checkbox + "Merge selected" toolbar button, calls existing `POST /api/review/merge` (2026-06-29)
- ✅ **Split a listing** — per-photo select overlay + "Split into new draft" button, calls existing `POST /api/review/:id/split` (2026-06-29)
- ✅ **"Ready to publish" section** — green section at the top of Listing review showing `auto_ready` drafts (high confidence, price auto-filled), with a per-item Publish/Reject and a one-click "Approve & publish all" bulk action (reuses existing `approve-bulk` + `publish` APIs). Also added a matching card on Today. Unblocked the 3 real Hermès Shoes listings that had been stranded with no UI path (2026-06-30).
- ✅ **Duplicate-detection safeguard before bulk-publish** — "Ready to publish" now groups items by vendor+price+sizes+colours; matches (2+) get an amber "Possible duplicate" badge, are excluded from "Approve & publish all", and require a one-click "Publish anyway?" confirmation to publish individually. Verified with synthetic test rows (2026-06-30) before deleting them — never touched real data during the test.

## Vendors

- ✅ Vendor requests (real, wired to `/api/chats/unmapped` + `/api/chats/map`)
- 💡 Active vendors table (reliability/lead time/payout) — removed from console, no backend data source exists for these metrics

## Order approval / Daily catalog / Analytics

- 💡 Hidden from the console entirely (2026-06-29) until there's a real backend. Needs, if/when prioritized:
  - Orders data model + payment-proof matching + courier dispatch integration (Order approval)
  - Multi-channel broadcast integration — Telegram/WhatsApp/Instagram (Daily catalog)
  - Real sales/margin aggregation (Analytics)

## Shopify integration

- ✅ Fixed `productSet` mutation (was using `productCreate`, which silently capped multi-variant products to one variant on current API versions)
- ✅ Client-credentials auth (the old static `SHOPIFY_TOKEN` model was retired by Shopify Jan 2026)
- ✅ Pinned to current stable API version (`2025-10`) — re-check yearly, see comment in `src/shopify-queue.js`
- ✅ Published products' `Type` field (Product organization → Type in Shopify admin) now set to the resolved **collection** name instead of the AI's short internal category, matching how the rest of the catalog is organized and how smart-collection rules match (2026-06-30, found via direct catalog inspection)
- 💡 **Demo/seed products found in the catalog** — a cluster of generic products (Necklace, Jacket, Tracksuit, Bag, Watch, Shoes, 4× Sunglass, Scarf) created within ~13 minutes on 2026-06-29, likely leftover from store/theme setup, not real inventory. Not removed — flag for cleanup before going fully live.

## AI usage & cost

- ✅ **AI cost tracking (Settings page)** — every Anthropic Message Batches API result now records its token usage to a new `ai_usage` table; cost is calculated from Claude Haiku 4.5's published per-token pricing with the 50% batch discount applied. Settings shows Today / This month / All-time spend + token counts. **Anthropic has no API for account credit balance** (checked the full endpoint surface — Messages, Batches, Files, Models — it's Console-only at platform.claude.com), so this is calculated spend, not a live balance; the user chose not to add a manual balance/threshold tracker on top of it (2026-06-30).

## Marketing

- ✅ **AI-generated marketing content per listing** — the AI photo-analysis step now also generates SEO title/meta description/description/tags/alt text, a social media caption, an email blurb, and ad copy (headline + primary text) for every product, alongside the existing cataloging. SEO fields publish directly to Shopify (`seo.title`, `seo.description`, `descriptionHtml`, `tags`, photo `alt` text) via the existing `productSet` call. All fields are editable in a collapsible "Marketing" section on each Listing Review card; social/email/ad copy have one-click Copy buttons since there's no auto-posting integration (by design — text generation only, not channel automation). Verified end-to-end with a disposable DRAFT-status Shopify product (2026-06-30): confirmed `seo`, `descriptionHtml`, `tags`, and photo `alt` all landed correctly, then deleted the test product.
- 💡 **Not yet built**: no automated posting to social platforms, no email-platform integration (Klaviyo/Shopify Email), no ad-platform integration (Meta/Google Ads API) — explicitly out of scope for now, per the original request.

## Branding

- ✅ Console rebranded to "UK Stylish Club" (was generic "Store OS" placeholder from the design handoff)
