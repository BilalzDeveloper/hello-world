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

const DATA_DIR = process.env.DATA_DIR || '/data';
const IMG_DIR = path.join(DATA_DIR, 'images');
const BATCH_STATE_FILE = path.join(DATA_DIR, 'batch-state.json');
const MODEL = 'claude-haiku-4-5';
const GROUP_WINDOW_MS = 10 * 60 * 1000; // photos within 10 min = same product
const MAX_IMAGES_PER_REQUEST = 4;
const APP_URL = process.env.APP_URL || 'https://uksc.fly.dev';

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
function analysisPrompt() {
  return `You are a fashion product analyst for a UK menswear store. These photo(s) show ONE product (possibly from multiple angles). Return ONLY valid JSON, no markdown, with exactly these fields:
{"productType":"one of [${vendors.PRODUCT_TYPES.map((t) => `"${t}"`).join(',')}] or \"Unknown\"","brand":"visible brand or Unknown","styleName":"model/style name or empty string","colours":["colour1"],"isFootwear":false,"confidence":"high or low","notes":"any flags, e.g. blurry, multiple products, counterfeit doubt"}`;
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
      for (const img of group) {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: fs.readFileSync(img.file_path).toString('base64'),
          },
        });
      }
      content.push({ type: 'text', text: analysisPrompt() });
      requests.push({
        custom_id: customId,
        params: {
          model: MODEL,
          max_tokens: 500,
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
      const text = result.result.message.content.find((b) => b.type === 'text')?.text || '{}';
      const analysis = parseAnalysis(text);

      for (const hash of map.hashes) {
        await db.query(
          `INSERT INTO analyses (hash, analysis, model, analysed_at)
           VALUES ($1, $2, $3, now())
           ON CONFLICT (hash) DO UPDATE SET analysis = $2, model = $3, analysed_at = now()`,
          [hash, JSON.stringify(analysis), MODEL]
        );
      }
      await db.query(`UPDATE images SET status = 'analysed' WHERE hash = ANY($1)`, [map.hashes]);

      const key = [map.vendor, analysis.brand, analysis.productType, analysis.styleName].join('|');
      if (!grouped[key]) {
        grouped[key] = { vendor: map.vendor, analysis, hashes: [], lowConf: false, notes: new Set() };
      }
      grouped[key].hashes.push(...map.hashes);
      if (analysis.confidence !== 'high') grouped[key].lowConf = true;
      if (analysis.notes) grouped[key].notes.add(String(analysis.notes));

      const pv = (stats.perVendor[map.vendor] ||= { photos: 0, products: 0 });
      pv.photos += map.hashes.length;
    }

    const priceRules = await db.query('SELECT product_type, price FROM price_rules');
    const ruleFor = Object.fromEntries(priceRules.rows.map((r) => [r.product_type, r.price]));

    for (const g of Object.values(grouped)) {
      const a = g.analysis;
      const type = vendors.PRODUCT_TYPES.includes(a.productType) ? a.productType : 'Unknown';
      const collection = vendors.collectionFor(type);
      const confidence = g.lowConf || type === 'Unknown' ? 'low' : 'high';
      const price = confidence === 'high' && ruleFor[type] != null ? ruleFor[type] : null;
      const state_ = price != null ? 'auto_ready' : 'needs_review';
      const title = [g.vendor, a.brand !== 'Unknown' ? a.brand : '', type !== 'Unknown' ? type : '', a.styleName]
        .filter(Boolean).join(' ').trim() || `${g.vendor} product`;

      await db.query(
        `INSERT INTO review_queue
           (vendor, title, product_type, collection, colours, sizes, price,
            confidence, notes, image_hashes, state, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())`,
        [
          g.vendor, title, type, collection,
          (Array.isArray(a.colours) && a.colours.length ? a.colours : ['Black']).join(', '),
          vendors.sizesFor(type, a.isFootwear),
          price, confidence, [...g.notes].join('; '), g.hashes, state_,
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

function parseAnalysis(text) {
  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    return {
      productType: String(parsed.productType || 'Unknown'),
      brand: String(parsed.brand || 'Unknown'),
      styleName: String(parsed.styleName || ''),
      colours: Array.isArray(parsed.colours) ? parsed.colours.map(String) : ['Black'],
      isFootwear: Boolean(parsed.isFootwear),
      confidence: parsed.confidence === 'high' ? 'high' : 'low',
      notes: String(parsed.notes || ''),
    };
  } catch {
    return {
      productType: 'Unknown', brand: 'Unknown', styleName: '', colours: ['Black'],
      isFootwear: false, confidence: 'low', notes: 'Analysis parse error',
    };
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

module.exports = { ingestImage, runBatchCycle, startCron };
