// Image intake → resize → hash → dedupe → Anthropic Message Batches analysis
// → review queue. Cron submits ONE batch per cycle (cheap, async) and a digest
// goes to my Saved Messages when each batch completes.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const cron = require('node-cron');
const Anthropic = require('@anthropic-ai/sdk');

const db = require('./db');
const vendors = require('./vendors');

// Image + state storage. Override with DATA_DIR if you want another path.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const IMG_DIR = path.join(DATA_DIR, 'images');
const BATCH_STATE_FILE = path.join(DATA_DIR, 'batch-state.json');
const MODEL = 'claude-haiku-4-5';
// claude-haiku-4-5 pricing per platform.claude.com/docs/en/pricing — $/MTok.
// Message Batches API is 50% off standard rates.
const PRICE_PER_MTOK_INPUT = 1.00;
const PRICE_PER_MTOK_OUTPUT = 5.00;
const BATCH_DISCOUNT = 0.5;
const GROUP_WINDOW_MS = 10 * 60 * 1000; // photos within 10 min = same product
const MAX_IMAGES_PER_REQUEST = 4;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

let anthropic = null;
function client() {
  if (!anthropic) {
    if (!process.env.ANTHROPIC_KEY) throw new Error('ANTHROPIC_KEY not set');
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_KEY });
  }
  return anthropic;
}

// Lazy to avoid the require cycle (userbot → pipeline).
function sendSavedMessage(text) {
  return require('./userbot').sendSavedMessage(text);
}

// ── intake ─────────────────────────────────────────────────────────────────────
async function ingestImage(buffer, meta) {
  const { vendor, source, chatId = null, msgId = null, caption = '' } = meta;

  const resized = await sharp(buffer)
    .rotate()
    .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  const hash = crypto.createHash('sha256').update(resized).digest('hex');

  const existing = await db.query('SELECT hash FROM images WHERE hash = $1', [hash]);
  if (existing.rows.length) {
    // Same photo seen before: count the cache hit, never re-analyse or duplicate.
    await db.query(
      'UPDATE analyses SET cached_hits = cached_hits + 1 WHERE hash = $1', [hash]
    );
    return { hash, duplicate: true };
  }

  fs.mkdirSync(IMG_DIR, { recursive: true });
  const filePath = path.join(IMG_DIR, `${hash}.jpg`);
  fs.writeFileSync(filePath, resized);

  await db.query(
    `INSERT INTO images (hash, vendor, source, tg_chat_id, tg_msg_id, file_path, received_at, status)
     VALUES ($1, $2, $3, $4, $5, $6, now(), 'pending_analysis')
     ON CONFLICT (hash) DO NOTHING`,
    [hash, vendor, source, chatId, msgId, filePath]
  );
  if (caption) {
    // keep nothing else from captions — vendor code was already extracted
  }
  return { hash, duplicate: false };
}

// ── analysis prompt ────────────────────────────────────────────────────────────
// Images may be a single product (multiple angles) OR several different
// products a vendor sent back-to-back — the model must split them, not assume one.
function analysisPrompt(imageCount) {
  return `You are a fashion product analyst and marketing copywriter for a UK menswear resale store (ukstylishclub.com). You are shown ${imageCount} image(s), labelled "Image 0" through "Image ${imageCount - 1}" in that order before each photo.

These images may show ONE product (e.g. multiple angles of the same item) OR MULTIPLE DIFFERENT products (e.g. a vendor sent several distinct items in one batch). Group images that show the same physical item together; put different items in separate entries. Do not merge unrelated items just because they were sent together.

For each distinct product, also write marketing copy for it: an SEO title and meta description for Google, a short product description, search tags, alt text describing the photo, a social media caption with hashtags, a short marketing email blurb, and ad copy for Meta/Google ads. Keep all copy honest and specific to what's visible — never invent details (material, condition, authenticity) you can't see in the photo.

Return ONLY a valid JSON array, no markdown, with one entry per distinct product:
[{
  "imageIndices": [0,1],
  "productType": "one of [${vendors.PRODUCT_TYPES.map((t) => `"${t}"`).join(',')}] or \"Unknown\"",
  "brand": "visible brand or Unknown",
  "styleName": "model/style name or empty string",
  "colours": ["colour1"],
  "isFootwear": false,
  "confidence": "high or low",
  "notes": "any flags, e.g. blurry, counterfeit doubt",
  "seoTitle": "SEO-optimised product title, max 60 characters",
  "seoDescription": "SEO meta description, max 160 characters",
  "descriptionHtml": "2-3 sentence product description, may use <p> and <ul>/<li> tags",
  "tags": ["keyword1", "keyword2"],
  "altText": "one sentence describing what's in the photo, for accessibility/SEO",
  "socialCaption": "short Instagram/TikTok caption with 3-5 relevant hashtags",
  "emailBlurb": "1-2 sentence promotional snippet for a newsletter",
  "adHeadline": "short ad headline, max 40 characters",
  "adPrimaryText": "ad primary text, 1-2 sentences"
}]`;
}

// ── batch cycle ────────────────────────────────────────────────────────────────
let cycleRunning = false;

async function runBatchCycle() {
  if (cycleRunning) return { skipped: 'cycle already running' };
  cycleRunning = true;
  try {
    // Resume a batch that was in flight when the server restarted.
    const prior = loadBatchState();
    if (prior) {
      console.log(`pipeline: resuming batch ${prior.batchId}`);
      await pollBatchUntilDone(prior);
    }

    // Un-stick any 'analysing' rows with no live batch (crash leftovers).
    await db.query(
      `UPDATE images SET status = 'pending_analysis'
       WHERE status = 'analysing' AND received_at < now() - interval '6 hours'`
    );

    const pending = await db.query(
      `SELECT * FROM images WHERE status = 'pending_analysis'
       ORDER BY vendor, tg_chat_id NULLS LAST, received_at`
    );
    if (!pending.rows.length) return { submitted: 0, message: 'nothing pending' };

    const groups = groupCandidates(pending.rows);
    const requests = [];
    const mapping = {}; // custom_id -> { hashes, vendor }

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const customId = `p${Date.now()}-${i}`;
      const content = [];
      group.forEach((img, idx) => {
        content.push({ type: 'text', text: `Image ${idx}:` });
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: fs.readFileSync(img.file_path).toString('base64'),
          },
        });
      });
      content.push({ type: 'text', text: analysisPrompt(group.length) });
      requests.push({
        custom_id: customId,
        params: {
          model: MODEL,
          max_tokens: 3000, // higher than the bare classification needed — now also generating marketing copy per product
          messages: [{ role: 'user', content }],
        },
      });
      mapping[customId] = { hashes: group.map((g) => g.hash), vendor: group[0].vendor };
    }

    const allHashes = groups.flat().map((g) => g.hash);
    await db.query(`UPDATE images SET status = 'analysing' WHERE hash = ANY($1)`, [allHashes]);

    const batch = await client().messages.batches.create({ requests });
    console.log(`pipeline: submitted batch ${batch.id} (${requests.length} product candidates, ${allHashes.length} photos)`);

    const state = { batchId: batch.id, mapping, submittedAt: Date.now() };
    saveBatchState(state);
    await pollBatchUntilDone(state);

    return { submitted: requests.length, photos: allHashes.length, batchId: batch.id };
  } finally {
    cycleRunning = false;
  }
}

// Group consecutive photos from the same chat (or gallery upload) arriving
// within 10 minutes — likely the same product from multiple angles. Max 4.
function groupCandidates(rows) {
  const groups = [];
  let current = null;
  let lastKey = null;
  let lastTime = 0;
  for (const row of rows) {
    const key = `${row.vendor}|${row.tg_chat_id ?? 'gallery'}`;
    const t = new Date(row.received_at).getTime();
    const sameProduct = current
      && key === lastKey
      && t - lastTime <= GROUP_WINDOW_MS
      && current.length < MAX_IMAGES_PER_REQUEST;
    if (sameProduct) {
      current.push(row);
    } else {
      current = [row];
      groups.push(current);
    }
    lastKey = key;
    lastTime = t;
  }
  return groups;
}

// ── polling + result handling ──────────────────────────────────────────────────
async function pollBatchUntilDone(state) {
  const { batchId, mapping } = state;
  try {
    let batch;
    for (;;) {
      batch = await client().messages.batches.retrieve(batchId);
      if (batch.processing_status === 'ended') break;
      await sleep(30_000);
    }

    const stats = {
      perVendor: {},   // vendor -> { photos, products }
      failed: 0,
    };

    const grouped = {}; // vendor|brand|type|style -> { analysis, hashes, lowConf, notes }

    for await (const result of await client().messages.batches.results(batchId)) {
      const map = mapping[result.custom_id];
      if (!map) continue;
      if (result.result.type !== 'succeeded') {
        stats.failed++;
        await db.query(
          `UPDATE images SET status = 'pending_analysis' WHERE hash = ANY($1)`,
          [map.hashes]
        );
        continue;
      }
      const usage = result.result.message.usage;
      if (usage) {
        const cost = (usage.input_tokens / 1e6 * PRICE_PER_MTOK_INPUT
          + usage.output_tokens / 1e6 * PRICE_PER_MTOK_OUTPUT) * BATCH_DISCOUNT;
        await db.query(
          `INSERT INTO ai_usage (batch_id, model, input_tokens, output_tokens, cost_usd) VALUES ($1, $2, $3, $4, $5)`,
          [batchId, MODEL, usage.input_tokens, usage.output_tokens, cost]
        );
      }

      const text = result.result.message.content.find((b) => b.type === 'text')?.text || '[]';
      const analyses = parseAnalyses(text, map.hashes.length);
      const pv = (stats.perVendor[map.vendor] ||= { photos: 0, products: 0 });

      for (const analysis of analyses) {
        const hashes = analysis.imageIndices.map((i) => map.hashes[i]).filter(Boolean);
        if (!hashes.length) continue;

        for (const hash of hashes) {
          await db.query(
            `INSERT INTO analyses (hash, analysis, model, analysed_at)
             VALUES ($1, $2, $3, now())
             ON CONFLICT (hash) DO UPDATE SET analysis = $2, model = $3, analysed_at = now()`,
            [hash, JSON.stringify(analysis), MODEL]
          );
        }
        await db.query(`UPDATE images SET status = 'analysed' WHERE hash = ANY($1)`, [hashes]);

        const key = [map.vendor, analysis.brand, analysis.productType, analysis.styleName].join('|');
        if (!grouped[key]) {
          grouped[key] = { vendor: map.vendor, analysis, hashes: [], lowConf: false, notes: new Set() };
        }
        grouped[key].hashes.push(...hashes);
        if (analysis.confidence !== 'high') grouped[key].lowConf = true;
        if (analysis.notes) grouped[key].notes.add(String(analysis.notes));

        pv.photos += hashes.length;
      }
    }

    const priceRules = await db.query('SELECT product_type, price FROM price_rules');
    const ruleFor = Object.fromEntries(priceRules.rows.map((r) => [r.product_type, r.price]));
    const collectionRules = await db.query('SELECT product_type, collection FROM collection_rules');
    const collectionFor = Object.fromEntries(collectionRules.rows.map((r) => [r.product_type, r.collection]));

    for (const g of Object.values(grouped)) {
      const a = g.analysis;
      const type = vendors.PRODUCT_TYPES.includes(a.productType) ? a.productType : 'Unknown';
      const collection = collectionFor[type] || vendors.collectionFor(type);
      const confidence = g.lowConf || type === 'Unknown' ? 'low' : 'high';
      const price = confidence === 'high' && ruleFor[type] != null ? ruleFor[type] : null;
      const state_ = price != null ? 'auto_ready' : 'needs_review';
      const title = [g.vendor, a.brand !== 'Unknown' ? a.brand : '', type !== 'Unknown' ? type : '', a.styleName]
        .filter(Boolean).join(' ').trim() || `${g.vendor} product`;

      await db.query(
        `INSERT INTO review_queue
           (vendor, title, product_type, collection, colours, sizes, price,
            confidence, notes, image_hashes, state, marketing, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now())`,
        [
          g.vendor, title, type, collection,
          (Array.isArray(a.colours) && a.colours.length ? a.colours : ['Black']).join(', '),
          vendors.sizesFor(type, a.isFootwear),
          price, confidence, [...g.notes].join('; '), g.hashes, state_, JSON.stringify(a.marketing || {}),
        ]
      );
      (stats.perVendor[g.vendor] ||= { photos: 0, products: 0 }).products += 1;
    }

    clearBatchState();
    await sendDigest(stats);
  } catch (e) {
    console.error('pipeline poll error:', e.message);
    // Keep the state file so the next cycle resumes this batch.
  }
}

// Splits one model response into per-product entries, each naming which image
// indices (within this request) belong to it. Any index the model omits gets
// its own fallback "Unknown" entry so a photo never gets stuck unclassified.
function parseAnalyses(text, imageCount) {
  const toItem = (p) => ({
    productType: String(p?.productType || 'Unknown'),
    brand: String(p?.brand || 'Unknown'),
    styleName: String(p?.styleName || ''),
    colours: Array.isArray(p?.colours) && p.colours.length ? p.colours.map(String) : ['Black'],
    isFootwear: Boolean(p?.isFootwear),
    confidence: p?.confidence === 'high' ? 'high' : 'low',
    notes: String(p?.notes || ''),
    marketing: {
      seoTitle: String(p?.seoTitle || ''),
      seoDescription: String(p?.seoDescription || ''),
      descriptionHtml: String(p?.descriptionHtml || ''),
      tags: Array.isArray(p?.tags) ? p.tags.map(String).filter(Boolean) : [],
      altText: String(p?.altText || ''),
      socialCaption: String(p?.socialCaption || ''),
      emailBlurb: String(p?.emailBlurb || ''),
      adHeadline: String(p?.adHeadline || ''),
      adPrimaryText: String(p?.adPrimaryText || ''),
    },
  });
  const fallback = (imageIndices, notes) => ({ ...toItem({}), imageIndices, notes });
  const allIndices = Array.from({ length: imageCount }, (_, i) => i);

  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    const seen = new Set();
    const items = [];
    for (const p of arr) {
      const indices = (Array.isArray(p.imageIndices) ? p.imageIndices : [])
        .map(Number)
        .filter((n) => Number.isInteger(n) && n >= 0 && n < imageCount && !seen.has(n));
      indices.forEach((n) => seen.add(n));
      if (indices.length) items.push({ ...toItem(p), imageIndices: indices });
    }
    for (const i of allIndices) {
      if (!seen.has(i)) items.push(fallback([i], 'Not classified by analysis'));
    }
    return items.length ? items : [fallback(allIndices, 'Analysis parse error')];
  } catch {
    return [fallback(allIndices, 'Analysis parse error')];
  }
}

// ── digest to Saved Messages ───────────────────────────────────────────────────
async function sendDigest(stats) {
  const lines = ['📦 UKSC batch complete'];
  const entries = Object.entries(stats.perVendor);
  if (!entries.length) lines.push('No products produced.');
  for (const [vendor, s] of entries.sort()) {
    lines.push(`• ${vendor}: ${s.photos} photo(s) → ${s.products} product(s)`);
  }
  if (stats.failed) lines.push(`⚠️ ${stats.failed} request(s) failed — re-queued`);

  const hits = await db.query('SELECT COALESCE(SUM(cached_hits),0)::int AS n FROM analyses');
  if (hits.rows[0].n) lines.push(`♻️ ${hits.rows[0].n} duplicate photo(s) served from cache (total)`);

  const unmapped = await db.query(`SELECT COUNT(*)::int AS n FROM vendor_chats WHERE vendor IS NULL`);
  if (unmapped.rows[0].n) lines.push(`⚠️ ${unmapped.rows[0].n} unmapped chat(s) — map them in Settings`);

  lines.push(`\nReview → ${APP_URL}`);
  await sendSavedMessage(lines.join('\n'));
}

// ── batch state persistence (survives restarts via the Fly volume) ────────────
function loadBatchState() {
  try { return JSON.parse(fs.readFileSync(BATCH_STATE_FILE, 'utf8')); } catch { return null; }
}
function saveBatchState(state) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(BATCH_STATE_FILE, JSON.stringify(state));
}
function clearBatchState() {
  try { fs.unlinkSync(BATCH_STATE_FILE); } catch {}
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ── cron ───────────────────────────────────────────────────────────────────────
function startCron() {
  cron.schedule('*/15 * * * *', () => {
    runBatchCycle().catch((e) => console.error('pipeline cycle error:', e.message));
  });
  console.log('pipeline: cron scheduled (every 15 min)');
  // Resume any in-flight batch from before a restart.
  if (loadBatchState()) {
    runBatchCycle().catch((e) => console.error('pipeline resume error:', e.message));
  }
}

module.exports = { ingestImage, runBatchCycle, startCron, isCycleRunning: () => cycleRunning };
