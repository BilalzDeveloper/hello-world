// UKSC v2 — Express server: serves /public + JSON API behind app-password auth.

require('dotenv').config();
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const multer = require('multer');

const db = require('./db');
const vendors = require('./vendors');
const pipeline = require('./pipeline');
const shopifyQueue = require('./shopify-queue');

const PORT = Number(process.env.PORT || 3000);
// Image + state storage. Override with DATA_DIR if you want another path.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const APP_PASSWORD = process.env.APP_PASSWORD || '';
const SESSION_DAYS = 30;
const COOKIE_NAME = 'uksc_session';

if (!APP_PASSWORD) console.error('WARNING: APP_PASSWORD is not set — logins will fail');

// Stateless session token: "<expiryMs>.<hmac>" signed with a key derived from
// APP_PASSWORD, so sessions survive restarts and nothing is stored server-side.
const sessionKey = crypto.createHash('sha256').update(`uksc-session:${APP_PASSWORD}`).digest();

function signSession(expiry) {
  const mac = crypto.createHmac('sha256', sessionKey).update(String(expiry)).digest('hex');
  return `${expiry}.${mac}`;
}

function verifySession(token) {
  if (typeof token !== 'string') return false;
  const [expiry, mac] = token.split('.');
  if (!/^\d+$/.test(expiry || '') || !mac) return false;
  if (Number(expiry) < Date.now()) return false;
  const expect = crypto.createHmac('sha256', sessionKey).update(expiry).digest();
  const got = Buffer.from(mac, 'hex');
  return got.length === expect.length && crypto.timingSafeEqual(got, expect);
}

// ── login rate limit (in-memory, per IP) ───────────────────────────────────────
const loginAttempts = new Map();
function loginLimited(ip) {
  const now = Date.now();
  const rec = loginAttempts.get(ip);
  if (!rec || rec.resetAt < now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return false;
  }
  rec.count += 1;
  return rec.count > 10;
}

const app = express();
app.set('trust proxy', 1); // Fly terminates TLS at the edge
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/healthz', (_req, res) => res.status(200).send('ok'));

app.post('/api/login', (req, res) => {
  if (loginLimited(req.ip)) return res.status(429).json({ error: 'Too many attempts — wait 15 min' });
  const pw = String(req.body?.password || '');
  const a = crypto.createHash('sha256').update(pw).digest();
  const b = crypto.createHash('sha256').update(APP_PASSWORD).digest();
  if (!APP_PASSWORD || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'Wrong password' });
  }
  const expiry = Date.now() + SESSION_DAYS * 24 * 3600 * 1000;
  res.cookie(COOKIE_NAME, signSession(expiry), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV !== 'development',
    maxAge: SESSION_DAYS * 24 * 3600 * 1000,
  });
  res.json({ ok: true });
});

// Everything under /api below this point requires a valid session cookie.
app.use('/api', (req, res, next) => {
  if (verifySession(req.cookies[COOKIE_NAME])) return next();
  res.status(401).json({ error: 'Not logged in' });
});

app.post('/api/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

// Shared config for the frontend (no secrets — names and maps only).
app.get('/api/config', (_req, res) => {
  res.json({
    vendors: vendors.VENDORS,
    productTypes: vendors.PRODUCT_TYPES,
    collectionMap: vendors.COLLECTION_MAP,
    collections: vendors.COLLECTIONS,
    footwearTypes: vendors.FOOTWEAR_TYPES,
  });
});

// ── inbox ──────────────────────────────────────────────────────────────────────
app.get('/api/inbox', async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT vendor, source, status, COUNT(*)::int AS n
       FROM images
       WHERE received_at >= now()::date
       GROUP BY vendor, source, status`
    );
    const review = await db.query(
      `SELECT vendor, state, COUNT(*)::int AS n FROM review_queue
       WHERE state IN ('needs_review','auto_ready','approved') GROUP BY vendor, state`
    );
    const unmapped = await db.query(
      `SELECT COUNT(*)::int AS n FROM vendor_chats WHERE vendor IS NULL`
    );
    res.json({
      images: rows,
      review: review.rows,
      unmappedChats: unmapped.rows[0].n,
    });
  } catch (e) { next(e); }
});

// ── review queue ───────────────────────────────────────────────────────────────
app.get('/api/review', async (req, res, next) => {
  try {
    const params = [];
    let where = `state IN ('needs_review','auto_ready','approved','failed')`;
    if (req.query.vendor) {
      if (!vendors.isValidVendor(String(req.query.vendor))) {
        return res.status(400).json({ error: 'Unknown vendor' });
      }
      params.push(req.query.vendor);
      where += ` AND vendor = $1`;
    }
    const { rows } = await db.query(
      `SELECT * FROM review_queue WHERE ${where} ORDER BY id DESC`, params
    );
    res.json(rows.map((r) => ({
      ...r,
      imageUrls: (r.image_hashes || []).map((h) => `/api/images/${h}`),
    })));
  } catch (e) { next(e); }
});

const EDITABLE = ['title', 'product_type', 'colours', 'sizes', 'price', 'notes', 'collection'];

app.patch('/api/review/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Bad id' });
    const cur = await db.query('SELECT * FROM review_queue WHERE id = $1', [id]);
    if (!cur.rows.length) return res.status(404).json({ error: 'Not found' });
    const row = cur.rows[0];
    if (row.state === 'published') return res.status(409).json({ error: 'Already published' });

    const action = req.body?.action; // 'approve' | 'skip' | undefined (plain edit)

    if (action === 'skip') {
      await db.query(
        `UPDATE images SET status = 'skipped' WHERE hash = ANY($1)`, [row.image_hashes || []]
      );
      await db.query('DELETE FROM review_queue WHERE id = $1', [id]);
      return res.json({ ok: true, skipped: true });
    }

    const body = req.body || {};
    // An explicit `collection` always wins over product_type's auto-derived
    // default — handled after the loop so it can't be clobbered by it.
    const explicitCollection = 'collection' in body;

    const sets = [];
    const params = [];
    for (const f of EDITABLE) {
      if (f === 'collection' || !(f in body)) continue;
      let v = body[f];
      if (f === 'price') {
        v = v === null || v === '' ? null : Number(v);
        if (v !== null && (!Number.isFinite(v) || v < 0)) return res.status(400).json({ error: 'Bad price' });
      } else {
        v = String(v ?? '').slice(0, 500);
      }
      if (f === 'product_type') {
        if (!vendors.PRODUCT_TYPES.includes(v) && v !== 'Unknown') {
          return res.status(400).json({ error: 'Unknown product type' });
        }
        params.push(v);
        sets.push(`product_type = $${params.length}`);
        if (!explicitCollection) {
          const rule = await db.query('SELECT collection FROM collection_rules WHERE product_type = $1', [v]);
          params.push(rule.rows[0]?.collection || vendors.collectionFor(v));
          sets.push(`collection = $${params.length}`);
        }
        continue;
      }
      params.push(v);
      sets.push(`${f} = $${params.length}`);
    }

    if (explicitCollection) {
      const v = String(body.collection ?? '').slice(0, 500);
      if (!vendors.COLLECTIONS.includes(v)) return res.status(400).json({ error: 'Unknown collection' });
      params.push(v);
      sets.push(`collection = $${params.length}`);
    }

    // Marketing fields (SEO, social, email, ad copy) are a JSONB blob —
    // partial updates merge into whatever the AI already generated rather
    // than requiring the whole object on every edit.
    const MARKETING_FIELDS = ['seoTitle', 'seoDescription', 'descriptionHtml', 'tags', 'altText', 'socialCaption', 'emailBlurb', 'adHeadline', 'adPrimaryText'];
    if (body.marketing && typeof body.marketing === 'object') {
      const patch = {};
      for (const f of MARKETING_FIELDS) {
        if (!(f in body.marketing)) continue;
        patch[f] = f === 'tags'
          ? (Array.isArray(body.marketing[f]) ? body.marketing[f].map(String).filter(Boolean) : [])
          : String(body.marketing[f] ?? '').slice(0, 2000);
      }
      params.push(JSON.stringify(patch));
      sets.push(`marketing = COALESCE(marketing, '{}'::jsonb) || $${params.length}::jsonb`);
    }

    if (action === 'approve') {
      const willHavePrice = 'price' in (req.body || {}) ? req.body.price : row.price;
      if (willHavePrice === null || willHavePrice === '' || Number(willHavePrice) <= 0) {
        return res.status(400).json({ error: 'Price required to approve' });
      }
      sets.push(`state = 'approved'`);
    }

    if (!sets.length) return res.json({ ok: true, unchanged: true });
    params.push(id);
    const { rows } = await db.query(
      `UPDATE review_queue SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`, params
    );
    res.json(rows[0]);
  } catch (e) { next(e); }
});

app.post('/api/review/approve-bulk', async (req, res, next) => {
  try {
    const { ids, vendor, onlyHighConfidence } = req.body || {};
    const conds = [`state IN ('needs_review','auto_ready')`, `price IS NOT NULL`, `price > 0`];
    const params = [];
    if (Array.isArray(ids) && ids.length) {
      if (!ids.every((i) => Number.isInteger(i))) return res.status(400).json({ error: 'Bad ids' });
      params.push(ids);
      conds.push(`id = ANY($${params.length})`);
    } else if (vendor) {
      if (!vendors.isValidVendor(String(vendor))) return res.status(400).json({ error: 'Unknown vendor' });
      params.push(vendor);
      conds.push(`vendor = $${params.length}`);
    }
    if (onlyHighConfidence) conds.push(`confidence = 'high'`);
    const { rows } = await db.query(
      `UPDATE review_queue SET state = 'approved' WHERE ${conds.join(' AND ')} RETURNING id`, params
    );
    res.json({ approved: rows.length, ids: rows.map((r) => r.id) });
  } catch (e) { next(e); }
});

// Photos the AI split into separate cards but are really one item (e.g.
// different angles, or the same item sent through two different vendor
// chats) — combine into a single product. Cross-vendor merges are allowed:
// the AI's per-chat vendor tagging is exactly the kind of signal that can be
// wrong here, and the human picking ids to merge is the actual check.
app.post('/api/review/merge', async (req, res, next) => {
  try {
    const { ids, keepId } = req.body || {};
    if (!Array.isArray(ids) || ids.length < 2 || !ids.every((i) => Number.isInteger(i))) {
      return res.status(400).json({ error: 'ids[] (2 or more) required' });
    }
    if (!Number.isInteger(keepId) || !ids.includes(keepId)) {
      return res.status(400).json({ error: 'keepId must be one of ids' });
    }
    const { rows } = await db.query('SELECT * FROM review_queue WHERE id = ANY($1)', [ids]);
    if (rows.length !== ids.length) return res.status(404).json({ error: 'One or more products not found' });
    if (rows.some((r) => r.state === 'published')) {
      return res.status(409).json({ error: 'Cannot merge an already-published product' });
    }

    const hashes = [...new Set(rows.flatMap((r) => r.image_hashes || []))];
    const otherIds = ids.filter((i) => i !== keepId);

    const { rows: updated } = await db.query(
      `UPDATE review_queue SET image_hashes = $1, state = 'needs_review' WHERE id = $2 RETURNING *`,
      [hashes, keepId]
    );
    await db.query('DELETE FROM review_queue WHERE id = ANY($1)', [otherIds]);
    res.json(updated[0]);
  } catch (e) { next(e); }
});

// One card actually contains photos of more than one item (the AI merged
// them by mistake) — break the selected photos out into a new product.
app.post('/api/review/:id/split', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Bad id' });
    const hashesToSplit = req.body?.hashes;
    if (!Array.isArray(hashesToSplit) || !hashesToSplit.length) {
      return res.status(400).json({ error: 'hashes[] required' });
    }
    const cur = await db.query('SELECT * FROM review_queue WHERE id = $1', [id]);
    if (!cur.rows.length) return res.status(404).json({ error: 'Not found' });
    const row = cur.rows[0];
    if (row.state === 'published') return res.status(409).json({ error: 'Already published' });

    const current = row.image_hashes || [];
    const splitSet = new Set(hashesToSplit.map(String));
    const remaining = current.filter((h) => !splitSet.has(h));
    const moving = current.filter((h) => splitSet.has(h));
    if (!moving.length) return res.status(400).json({ error: 'None of those photos belong to this product' });
    if (!remaining.length) return res.status(400).json({ error: 'Cannot split out every photo — at least one must remain' });

    const { rows: updated } = await db.query(
      `UPDATE review_queue SET image_hashes = $1, state = 'needs_review' WHERE id = $2 RETURNING *`,
      [remaining, id]
    );
    const { rows: created } = await db.query(
      `INSERT INTO review_queue
         (vendor, title, product_type, collection, colours, sizes, price, confidence, notes, image_hashes, state, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'needs_review', now())
       RETURNING *`,
      [
        row.vendor, `${row.vendor} product`, 'Unknown', vendors.collectionFor('Unknown'),
        '', vendors.sizesFor('Unknown', false), null, 'low', `Split from #${id}`, moving,
      ]
    );
    res.json({ original: updated[0], created: created[0] });
  } catch (e) { next(e); }
});

// ── publish queue ──────────────────────────────────────────────────────────────
app.post('/api/publish', async (req, res, next) => {
  try {
    const ids = req.body?.ids;
    if (!Array.isArray(ids) || !ids.length || !ids.every((i) => Number.isInteger(i))) {
      return res.status(400).json({ error: 'ids[] required' });
    }
    const jobId = await shopifyQueue.enqueue(ids);
    res.json({ jobId });
  } catch (e) { next(e); }
});

app.get('/api/queue', async (_req, res, next) => {
  try { res.json(await shopifyQueue.getStatus()); } catch (e) { next(e); }
});

// ── chat mapping ───────────────────────────────────────────────────────────────
app.get('/api/chats/unmapped', async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT vc.tg_chat_id, vc.chat_title,
              COALESCE(i.n, 0) AS image_count
       FROM vendor_chats vc
       LEFT JOIN (SELECT tg_chat_id, COUNT(*)::int AS n FROM images GROUP BY tg_chat_id) i
         ON i.tg_chat_id = vc.tg_chat_id
       WHERE vc.vendor IS NULL AND COALESCE(vc.is_worker, false) = false
       ORDER BY image_count DESC`
    );
    res.json(rows.map((r) => ({ ...r, tg_chat_id: String(r.tg_chat_id) })));
  } catch (e) { next(e); }
});

// Currently-flagged worker chats — the Vendors screen's "Worker chats" list.
// Once a chat is flagged it drops off /api/chats/unmapped, so without this
// there'd be nowhere in the console to see it's actually been set.
app.get('/api/chats/workers', async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT vc.tg_chat_id, vc.chat_title, vc.mapped_at,
              COALESCE(i.n, 0) AS image_count, i.last_received_at
       FROM vendor_chats vc
       LEFT JOIN (SELECT tg_chat_id, COUNT(*)::int AS n, MAX(received_at) AS last_received_at
                  FROM images GROUP BY tg_chat_id) i
         ON i.tg_chat_id = vc.tg_chat_id
       WHERE vc.is_worker = true
       ORDER BY vc.mapped_at DESC NULLS LAST`
    );
    res.json(rows.map((r) => ({ ...r, tg_chat_id: String(r.tg_chat_id) })));
  } catch (e) { next(e); }
});

// A worker chat sends photos on a vendor's behalf, with the vendor declared
// per-batch (see userbot.js openWorkerBatch) rather than mapped to the chat —
// so this only flips is_worker, leaving vendor untouched (NULL).
app.post('/api/chats/worker', async (req, res, next) => {
  try {
    const chatId = String(req.body?.chatId || '');
    if (!/^-?\d+$/.test(chatId)) return res.status(400).json({ error: 'Bad chatId' });
    await db.query(
      `INSERT INTO vendor_chats (tg_chat_id, is_worker, mapped_at)
       VALUES ($1, true, now())
       ON CONFLICT (tg_chat_id) DO UPDATE SET is_worker = true`,
      [chatId]
    );
    res.json({ ok: true });
  } catch (e) { next(e); }
});

app.post('/api/chats/worker/unflag', async (req, res, next) => {
  try {
    const chatId = String(req.body?.chatId || '');
    if (!/^-?\d+$/.test(chatId)) return res.status(400).json({ error: 'Bad chatId' });
    await db.query(`UPDATE vendor_chats SET is_worker = false WHERE tg_chat_id = $1`, [chatId]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

app.post('/api/chats/map', async (req, res, next) => {
  try {
    const chatId = String(req.body?.chatId || '');
    const vendor = String(req.body?.vendor || '');
    if (!/^-?\d+$/.test(chatId)) return res.status(400).json({ error: 'Bad chatId' });
    if (!vendors.isValidVendor(vendor)) return res.status(400).json({ error: 'Unknown vendor' });
    await db.query(
      `INSERT INTO vendor_chats (tg_chat_id, vendor, mapped_at)
       VALUES ($1, $2, now())
       ON CONFLICT (tg_chat_id) DO UPDATE SET vendor = $2, mapped_at = now()`,
      [chatId, vendor]
    );
    if (vendor !== vendors.VENDOR_IGNORED && vendor !== vendors.VENDOR_UNASSIGNED) {
      // Retroactively claim this chat's unassigned images.
      await db.query(
        `UPDATE images SET vendor = $2 WHERE tg_chat_id = $1 AND vendor = 'UNASSIGNED'`,
        [chatId, vendor]
      );
      await db.query(
        `UPDATE review_queue SET vendor = $2 WHERE vendor = 'UNASSIGNED' AND id IN (
           SELECT rq.id FROM review_queue rq
           JOIN images i ON i.hash = ANY(rq.image_hashes)
           WHERE i.tg_chat_id = $1)`,
        [chatId, vendor]
      );
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ── price rules ────────────────────────────────────────────────────────────────
app.get('/api/price-rules', async (_req, res, next) => {
  try {
    const { rows } = await db.query('SELECT product_type, price FROM price_rules ORDER BY product_type');
    res.json(rows);
  } catch (e) { next(e); }
});

app.put('/api/price-rules', async (req, res, next) => {
  try {
    const rules = req.body?.rules;
    if (!Array.isArray(rules)) return res.status(400).json({ error: 'rules[] required' });
    for (const r of rules) {
      if (!vendors.PRODUCT_TYPES.includes(r.product_type)) {
        return res.status(400).json({ error: `Unknown type: ${r.product_type}` });
      }
      const price = r.price === null || r.price === '' ? null : Number(r.price);
      if (price !== null && (!Number.isFinite(price) || price < 0)) {
        return res.status(400).json({ error: `Bad price for ${r.product_type}` });
      }
      if (price === null) {
        await db.query('DELETE FROM price_rules WHERE product_type = $1', [r.product_type]);
      } else {
        await db.query(
          `INSERT INTO price_rules (product_type, price) VALUES ($1, $2)
           ON CONFLICT (product_type) DO UPDATE SET price = $2`,
          [r.product_type, price]
        );
      }
    }
    const { rows } = await db.query('SELECT product_type, price FROM price_rules ORDER BY product_type');
    res.json(rows);
  } catch (e) { next(e); }
});

// ── collection rules (default product_type -> Shopify collection mapping) ──────
app.get('/api/collection-rules', async (_req, res, next) => {
  try {
    const { rows } = await db.query('SELECT product_type, collection FROM collection_rules ORDER BY product_type');
    res.json(rows);
  } catch (e) { next(e); }
});

app.put('/api/collection-rules', async (req, res, next) => {
  try {
    const rules = req.body?.rules;
    if (!Array.isArray(rules)) return res.status(400).json({ error: 'rules[] required' });
    for (const r of rules) {
      if (!vendors.PRODUCT_TYPES.includes(r.product_type)) {
        return res.status(400).json({ error: `Unknown type: ${r.product_type}` });
      }
      if (!vendors.COLLECTIONS.includes(r.collection)) {
        return res.status(400).json({ error: `Unknown collection: ${r.collection}` });
      }
      await db.query(
        `INSERT INTO collection_rules (product_type, collection) VALUES ($1, $2)
         ON CONFLICT (product_type) DO UPDATE SET collection = $2`,
        [r.product_type, r.collection]
      );
    }
    const { rows } = await db.query('SELECT product_type, collection FROM collection_rules ORDER BY product_type');
    res.json(rows);
  } catch (e) { next(e); }
});

// ── AI usage / cost ──────────────────────────────────────────────────────────
// Anthropic has no API for remaining account balance (Console-only) — this is
// spend WE calculate from each batch result's token usage, not a live balance.
app.get('/api/ai-usage', async (_req, res, next) => {
  try {
    const periods = {
      today: `created_at >= date_trunc('day', now())`,
      month: `created_at >= date_trunc('month', now())`,
      allTime: `true`,
    };
    const out = {};
    for (const [key, where] of Object.entries(periods)) {
      const { rows } = await db.query(
        `SELECT count(*) AS requests,
                coalesce(sum(input_tokens), 0) AS input_tokens,
                coalesce(sum(output_tokens), 0) AS output_tokens,
                coalesce(sum(cost_usd), 0) AS cost_usd
         FROM ai_usage WHERE ${where}`
      );
      const r = rows[0];
      out[key] = {
        requests: Number(r.requests),
        inputTokens: Number(r.input_tokens),
        outputTokens: Number(r.output_tokens),
        costUsd: Number(r.cost_usd),
      };
    }
    res.json(out);
  } catch (e) { next(e); }
});

// ── gallery upload ─────────────────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 12 },
});

app.post('/api/upload', upload.array('photos', 12), async (req, res, next) => {
  try {
    const vendor = String(req.body?.vendor || '');
    if (!vendors.isValidVendor(vendor, { allowSpecial: false })) {
      return res.status(400).json({ error: 'Pick a valid vendor' });
    }
    if (!req.files?.length) return res.status(400).json({ error: 'No photos' });
    const results = [];
    for (const f of req.files) {
      results.push(await pipeline.ingestImage(f.buffer, { vendor, source: 'gallery' }));
    }
    res.json({ ingested: results });
  } catch (e) { next(e); }
});

// ── images ─────────────────────────────────────────────────────────────────────
app.get('/api/images/:hash', async (req, res, next) => {
  try {
    const hash = String(req.params.hash);
    if (!/^[a-f0-9]{64}$/.test(hash)) return res.status(400).json({ error: 'Bad hash' });
    const { rows } = await db.query('SELECT file_path FROM images WHERE hash = $1', [hash]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.set('Cache-Control', 'private, max-age=86400');
    res.sendFile(path.resolve(rows[0].file_path));
  } catch (e) { next(e); }
});

// ── pipeline manual trigger ────────────────────────────────────────────────────
// Fire-and-forget: responds immediately so the browser doesn't time out
// waiting for the full Anthropic batch cycle (can take 30-120 seconds).
app.post('/api/pipeline/trigger', async (_req, res, next) => {
  try {
    if (pipeline.isCycleRunning()) return res.json({ status: 'already_running' });
    const { rows } = await db.query(`SELECT COUNT(*)::int AS n FROM images WHERE status = 'pending_analysis'`);
    if (!rows[0].n) return res.json({ status: 'nothing_pending' });
    pipeline.runBatchCycle().catch((e) => console.error('manual trigger error:', e.message));
    res.json({ status: 'started', pending: rows[0].n });
  } catch (e) { next(e); }
});

app.get('/api/pipeline/status', async (_req, res, next) => {
  try {
    const { rows } = await db.query(`SELECT COUNT(*)::int AS n FROM images WHERE status = 'pending_analysis'`);
    res.json({ running: pipeline.isCycleRunning(), pendingPhotos: rows[0].n });
  } catch (e) { next(e); }
});

// ── static frontend ────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use((err, _req, res, _next) => {
  console.error('api error:', err.message);
  res.status(500).json({ error: err.message });
});

// ── boot ───────────────────────────────────────────────────────────────────────
async function start() {
  // Retry DB bootstrap so a Neon cold start or blip doesn't crash-loop the app;
  // /healthz responds as soon as the HTTP server is up.
  let dbReady = false;
  for (let i = 0; i < 30 && !dbReady; i++) {
    try {
      await db.bootstrap();
      dbReady = true;
    } catch (e) {
      console.error(`db bootstrap failed (attempt ${i + 1}):`, e.message);
      await new Promise((r) => setTimeout(r, Math.min(2000 * (i + 1), 15000)));
    }
  }
  if (!dbReady) {
    console.error('FATAL: could not reach database');
    process.exit(1);
  }

  app.listen(PORT, () => console.log(`uksc server listening on :${PORT}`));

  pipeline.startCron();
  shopifyQueue.resumeUnfinished();

  if (process.env.TELEGRAM_SESSION) {
    // Userbot runs in-process; it only ever WRITES to my own Saved Messages.
    require('./userbot').start().catch((e) => console.error('userbot failed to start:', e.message));
  } else {
    console.log('userbot: TELEGRAM_SESSION not set — skipping (run scripts/login.js)');
  }
}

if (require.main === module) start();

module.exports = { app, DATA_DIR };
