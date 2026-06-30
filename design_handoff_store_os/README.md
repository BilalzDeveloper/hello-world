# Handoff: Store OS — Reseller Ops Console

## Overview
**Store OS** is a web dashboard for the operator of a multi-vendor reseller shop. Vendors send product
messages (e.g. over Telegram); an automated "loop" ingests them, drafts listings, auto-publishes the
confident ones, broadcasts a daily catalog, takes orders, and books couriers. The manager's job is the
**human checkpoints**: approving the daily order batch (with payment-proof verification), reviewing
low-confidence AI listing drafts, and admitting/rejecting unknown vendors. The console makes those
checkpoints fast and surfaces how much of the loop ran hands-off.

It is a **single-page app with six views** selected from a left sidebar:
Today, Order approval, Listing review, Vendors, Daily catalog, Analytics.

## About the Design Files
The files in this bundle are **design references created in HTML** — a working prototype showing the
intended look and behavior. They are **not production code to copy directly**. The file
`Store OS Manager.dc.html` is authored in a bespoke in-house template format ("Design Component"): a
`<x-dc>` template with `{{ }}` holes plus a `class Component extends DCLogic` logic block, rendered by the
bundled `support.js` runtime. **Do not ship `support.js` or the `.dc.html` format.**

Your task is to **recreate this design in the target codebase's existing environment** (React, Vue,
Svelte, etc.) using its established components, patterns, and libraries. If no environment exists yet,
choose the most appropriate framework and implement it there. The logic block is a clear, readable
reference for the data model, state transitions, and derived/formatted values — port that logic to your
stack's idioms (the `renderVals()` method maps state → view props; `state` near the top of the class is
the seed data).

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, and interactions are all specified. Recreate
the UI pixel-perfectly using your codebase's existing libraries. All hex values, font sizes, and spacing
below are taken directly from the source.

## Design Tokens

### Color
| Token | Hex | Use |
|---|---|---|
| App background | `#f1f1f1` | Page canvas behind cards |
| Surface / card | `#ffffff` | Cards, sidebar, tables, drawer |
| Top bar | `#1a1a1a` | Global header background |
| Top bar search field | `#2c2c2e` bg / `#3a3a3c` border | Search input in header |
| Text primary | `#1a1a1a` | Headings, key numbers |
| Text body | `#2b2b2b` | Default body text |
| Text secondary | `#5a5a5a` / `#6b6b6b` | Descriptions |
| Text muted | `#8a8a8a` / `#9a9a9a` | Captions, labels, table headers |
| Border | `#e3e3e3` | Card / sidebar borders |
| Border light | `#ececec` / `#f1f1f1` | Internal dividers, table rows |
| Hover surface | `#f4f4f4` / `#fafafa` / `#fafbff` | Nav + row hover |
| **Indigo (brand/primary)** | `#4b53b5` | Logo, primary accent, approvals theme; gradient `linear-gradient(150deg,#3f4ba8,#2a2f6b)` for logo tile |
| Indigo tint bg | `#eef0fb` | Indigo icon tiles, tags |
| Indigo light bar | `#7c83d6` | Loop step bar |
| **Green (success / money)** | `#0c8a5f` (buttons) / `#0a7a52` (text) / `#37b97f`·`#37d180` (dots) | Matched, published, margin, "loop running" |
| Green tint bg | `#e7f4ee` / `#e7f0... `; "Loop running" pill `#13301f` bg / `#1d5236` border / `#5fd39a` text |
| **Amber (warning / flagged)** | `#b26b00` / `#9a5b00` (text) / `#e0b261` (bar) | Flagged, listing review, dispatched |
| Amber tint bg | `#fbf1dd` | Amber icon tiles, tags |
| **Blue (info / vendor)** | `#1f6feb` | Vendor requests, catalog step |
| Blue tint bg | `#e7f0fd` | Blue icon tiles, tags |
| **Red (error / fraud)** | `#b3261e` | Mismatch, reused-proof, blocked price |
| Red tint bg | `#fce9e7` | Error note background |
| Avatar | `#4b53b5` bg / `#fff` text | Manager avatar circle |

Confidence color ramp (listings): `>=95` green `#0a7a52`, `>=90` amber `#9a5b00`, else `#b26b00`.
Vendor reliability ramp: same thresholds/colors.

### Typography
- **Family:** `'Hanken Grotesk'`, Google Fonts, weights 400/500/600/700/800 (fallback `system-ui, -apple-system, sans-serif`). `-webkit-font-smoothing: antialiased`.
- Page H1: **24px / 700**, letter-spacing `-.5px`, color `#1a1a1a`.
- Section H2: **14px / 700**, letter-spacing `-.2px`.
- Card title: 14.5px / 700. KPI big number: ~24px / 800, summary number ~19px / 800; `font-variant-numeric: tabular-nums` on all numbers.
- Body: 13–13.5px. Caption/label: 11–12.5px. Sidebar section label: 11px / 700, letter-spacing `.5–.6px`, uppercase, `#9a9a9a`.
- Brand wordmark "Store OS": 14.5px / 700, `-.2px`; sub-label "RESELLER OPS": 10px / 500, `#9a9aa6`.

### Spacing / radius / shadow
- Card radius **12px**; smaller chips/buttons **8–9px**; pills **999px**; logo tile **8px**; icon tiles **10px**.
- Card padding ~17–22px. Page content max-width **1160px**, padding `28px 34px 64px`, centered.
- Borders are 1px solid `#e3e3e3`. The design is largely **flat** — color and 1px borders carry hierarchy, not shadows. Toasts/drawer use light elevation only.
- Custom scrollbar: 11px, thumb `#cfcfcf` (hover `#bcbcbc`), 9px radius, 3px transparent inset border, transparent track.

### Animations (keyframes)
- `soToast` — toast in: opacity 0→1, translateY 10px→0.
- `soDrawer` — right drawer slide: translateX 100%→0.
- `soFade` — opacity 0→1.
- `soRise` — opacity 0→1, translateY 6px→0.
All short (~120ms transitions on nav/hover; `transition: background .12s`).

## Layout (shell, shared across all views)
Full-height flex column, `height: 100vh`, `overflow: hidden`.
1. **Top bar** — fixed 56px, dark `#1a1a1a`. Left: logo tile + "Store OS / RESELLER OPS". Then a search field (`flex: 0 1 420px`, 34px tall, placeholder "Search orders, vendors, products…"). Spacer. A green "Loop running" status pill. A bell icon button (36px hit area). Manager avatar circle (31px, initial of `managerName`).
2. **Body** — flex row, `flex: 1`, `min-height: 0`.
   - **Sidebar** — 248px, white, 1px right border, scrollable. "MANAGE" group with 6 nav items (icon + label, some with count badges). Active item gets a filled/tinted style; hover `#f4f4f4`. Bottom "AUTOMATION" group: two dotted status lines ("85% of the loop is hands-off", and a live caption that changes when orders await).
   - **Main** — scrollable, content centered at 1160px max-width. Renders exactly one of the six views.

Nav count badges: Order approval = pending order count (dark `#1a1a1a` badge); Listing review & Vendors = amber `#b26b00` badges. Badges hidden when count is 0.

## Screens / Views

### 1. Today (default)
- **Header row:** greeting H1 (e.g. "Good morning, Bilal") + subtitle, and a primary button **"Review today's batch →"** (`#1a1a1a` bg, white) that navigates to Order approval.
- **KPI row:** responsive grid `repeat(auto-fit, minmax(212px, 1fr))`, 14px gap. White KPI cards (label + big tabular number).
- **"Needs your attention":** 3 cards (`minmax(280px,1fr)` grid) — Daily order batch (indigo), Listing review (amber, shows count), Vendor requests (blue). Each: icon tile + title + sub + count, a one-line summary, and a colored call-to-action row with arrow.
- **"The loop":** white card visualizing 6 pipeline steps (Ingested → Listed → Catalog → Orders → Approved → Dispatched), each a labelled value + sub + colored bar.
- **"Recent activity":** white card, list of timestamped events with a colored category tag + dot (Catalog/Listings/Payment/Vendor/Delivered).

### 2. Order approval
The core checkpoint. Goal: approve a batch of orders after verifying payment proofs.
- **Summary strip:** 3 mini-cards — Matched (green), Flagged (amber), Batch total (£).
- **Filter tabs:** All / Matched / Flagged / Mismatch (counts shown, dimmed).
- **Table:** white card. Header row with a select-all checkbox + columns: Order (id + customer), Channel, Items, Total, Match status. Each row: custom checkbox (19px, 1.8px border, fills indigo when checked), order id/customer, channel, item count, total (£), and a **match badge** (MATCHED green / FLAGGED amber / MISMATCH red / REUSED red). Rows are clickable (open drawer); hover `#fafbff`; selected rows tinted.
- **Right drawer** (slides in via `soDrawer`): order detail — customer/channel/address, items grouped by vendor with pickup lead times, order total, **payment proof** (amount, reference, payer) with a colored verification note:
  - MATCHED → green note "cleared to approve".
  - MISMATCH → amber note quantifying the shortfall, suggest requesting corrected transfer.
  - REUSED → red note "image hash matches a proof already used on #1042 … do not approve".
  - Actions: **Approve & dispatch** (green) / **Approve anyway** (amber when not matched), and **Request new proof**.
- **Sticky batch action bar** (when rows selected): "Approve N orders" → removes them, increments `approvedCount`, toast "marked paid in Shopify, couriers dispatched."

### 3. Listing review
AI drafts below the confidence threshold (above-threshold listings auto-published).
- **Toolbar:** vendor filter dropdown (with per-vendor counts + "All"), a sort dropdown (e.g. confidence ascending), shown/total count. Dropdowns are custom menus toggled via `openMenu` state; `z-index` layered above content.
- **Listing cards/grid:** each draft shows title, description, attributes, photo count, a **confidence meter** (bar width = conf%, color from ramp), a flag chip, vendor cost, pricing rule, computed sell price (or "— needs cost" in red if blocked), margin line, and **Approve & publish** (green) / **Add cost to publish** (amber, when blocked) + **Reject**. Publishing removes the draft, increments `publishedToday`, toast "published to Shopify."

### 4. Vendors
- Active vendor list/table: name + colored dot + short code, location, **reliability %** (bar + ramp color), lead time, product count, payout (£).
- **Vendor requests:** unknown senders (e.g. "@maya_r_ldn") held for approval, each with **Approve** (→ "registered as a Shopify Location") / **Reject** (→ "messages will be ignored") + toast.

### 5. Daily catalog
- Header + a **Broadcast** action.
- Catalog product rows: title, vendor (dot + name), price (£0), margin (£0).
- **Channels:** toggleable broadcast channels (e.g. Telegram, WhatsApp, etc.) each with icon, reach text, and an on/off switch (track `#0c8a5f` when on, knob slides left/right). Broadcasting requires ≥1 channel on; sets `broadcasted`, stamps a time, toast lists delivery per channel.

### 6. Analytics
- KPI cards (5): Revenue (7d), Vendor payout, Margin (7d, green), Blended margin %, Avg order.
- **7-day bar chart:** stacked revenue/margin bars per weekday (Mon–Sun); bar height scaled to max revenue (150px chart height), margin segment proportional within each bar. Day label + revenue value per bar.
- **Vendor performance table:** per vendor — dot + name, units, revenue (£0), payout (£0), and a margin % bar.

## Interactions & Behavior
- **Navigation:** sidebar items set `screen` ∈ {today, approvals, listings, vendors, catalog, analytics}; active styling derived from current screen. "Review today's batch" and the attention cards also navigate.
- **Order approval:** per-row checkbox toggle, select-all toggle, filter tabs filter the table, clicking a row opens the drawer (`drawerId`), approve/request actions remove the order and toast.
- **Listings:** vendor filter + sort menus, publish/reject mutate the list and toast; blocked listings can't publish until a cost is added.
- **Vendors:** approve/reject requests remove them and toast.
- **Catalog:** toggle channels, broadcast (guards against zero channels).
- **Toasts:** transient confirmation messages (`toast` state), animate in with `soToast`, auto-dismiss.
- **Drawer:** slides from right with `soDrawer`; close returns to the table.
- All hover states use a subtle background shift; transitions ~120ms.

## State Management
Single component state object (seeded in `state` near the top of the logic class, derived in `renderVals()`):
- `screen` — active view (string enum above).
- `vendors` — vendor master data keyed by short key: `{ name, short, dot (hex), location }`.
- `orders` — pending orders: `{ id, customer, channel, address, items:[{vendor,name,price}], total, match ('MATCHED'|'FLAGGED'|'MISMATCH'|'REUSED'), proofAmount, proofRef, payer }`.
- `selected` — map of orderId → bool (batch selection).
- `approvedCount` — running count of approved orders (feeds loop steps).
- `listings` — AI drafts: `{ id, title, desc, attrs, photos, conf (0–100), flag, cost, sell, rule, blocked }`.
- `publishedToday` — count of auto/approved publishes.
- `vendorReqs` — pending unknown senders: `{ id, name, … }`.
- `activeVendors` — `{ key, rel (0–100), lead, products, payout }`.
- `catalog` — `{ title, vendor (key), price, cost }`.
- `channels` — `{ key, name, reach, glyph, iconBg, iconColor, on (bool) }`.
- `broadcasted` — whether today's catalog has been sent.
- `filter` ('all'|'matched'|'flagged'|'mismatch'), `drawerId`, `toast`, `listingVendor`, `listingSort`, `openMenu`, `vendorSearch`.

**Transitions** (see methods): `go(screen)`, `toggleSelect`/`toggleAll`, `approveBatch`, `approveOne`,
`requestProof`, `approveVendor`/`rejectVendor`, `publishListing`/`rejectListing`, `setVendorFilter`/`setSort`,
`toggleChannel`, `broadcast`, `showToast`. There is **no data fetching** — all data is in-memory seed data;
in production these map to API reads/mutations (Shopify orders/locations, listing publish, courier dispatch,
channel broadcast).

## Derived / formatted values to replicate
- Money: `money` → `£X.XX`, `money0` → `£X` (no decimals). Both right-aligned with tabular numerals.
- Confidence & reliability color ramps (above).
- Loop steps, KPI sets, 7-day chart series, and vendor-performance rows are computed in `renderVals()` — port those formulas (e.g. blended margin = totalMargin/totalRevenue, bar heights scaled to max).
- `managerName` is a **prop** (default "Bilal"); `initial` is its uppercased first char.

## Props
- `managerName` (string, default `"Bilal"`) — drives the greeting and avatar initial.

## Assets
- **Fonts:** Google Fonts "Hanken Grotesk" (400–800). Load via `<link>` or self-host in your codebase.
- **Icons:** all inline **SVG, 24×24 viewBox, stroke-based** (stroke-width ~1.7–1.9, round caps/joins) — home, clipboard/check, star, storefront, box/cube, bar-chart, bell, search, arrow-right, user, checkmark, etc. Replace with your codebase's icon set (Lucide/Feather match this stroke style closely) rather than copying the raw paths.
- No raster images or logos — the logo is an SVG storefront glyph on an indigo gradient tile.

## Files
- `Store OS Manager.dc.html` — the full design reference (template + logic). Open in a browser to view live.
- `support.js` — the in-house runtime that renders the `.dc.html` file. **Reference only — do not ship.** Included so the prototype runs locally.
