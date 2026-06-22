// Throttled Shopify publisher. Runs fully server-side: queue state lives in
// the DB (review_queue.state + publish_log), so closing the browser or
// restarting the server never loses work — resumeUnfinished() picks it up.

const fs = require('fs');
const path = require('path');

const db = require('./db');
const vendors = require('./vendors');

const API_VERSION = '2024-01';
const THROTTLE_MS = 700;          // ~1.5 requests/sec
const MAX_ATTEMPTS = 3;
const PUBLISH_STATUS = (process.env.PUBLISH_STATUS || 'ACTIVE').toUpperCase();

let running = false;
let lastRequestAt = 0;
let collectionCache = null; // title(lower) -> id, fetched once per run

function shopifyConfig() {
  const domain = process.env.SHOPIFY_DOMAIN;
  const token = process.env.SHOPIFY_TOKEN;
  if (!domain || !token) throw new Error('SHOPIFY_DOMAIN / SHOPIFY_TOKEN not set');
  return { domain, token };
}

async function gql(query, variables = {}) {
  const { domain, token } = shopifyConfig();
  // global throttle across the whole queue
  const wait = lastRequestAt + THROTTLE_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();

  const scheme = domain.startsWith('localhost') || domain.startsWith('127.') ? 'http' : 'https';
  const r = await fetch(`${scheme}://${domain}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  if (r.status === 429) {
    await sleep(2000);
    throw new Error('Shopify throttled (429)');
  }
  if (!r.ok) throw new Error(`Shopify HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  if (d.errors?.length) throw new Error(`Shopify GraphQL: ${JSON.stringify(d.errors).slice(0, 300)}`);
  return d.data;
}

// ── public API ─────────────────────────────────────────────────────────────────
async function enqueue(reviewIds) {
  const { rows } = await db.query(
    `SELECT id FROM review_queue WHERE id = ANY($1) AND state = 'approved'`, [reviewIds]
  );
  if (!rows.length) throw new Error('No approved rows in ids');
  for (const r of rows) {
    await db.query(
      `INSERT INTO publish_log (review_id, status, attempts) VALUES ($1, 'queued', 0)`,
      [r.id]
    );
  }
  kick();
  return `job-${Date.now()}`;
}

async function getStatus() {
  const { rows } = await db.query(
    `SELECT DISTINCT ON (pl.review_id)
            pl.review_id, pl.status, pl.error, pl.attempts, pl.shopify_product_id,
            rq.title, rq.vendor, rq.state AS review_state
     FROM publish_log pl
     LEFT JOIN review_queue rq ON rq.id = pl.review_id
     ORDER BY pl.review_id, pl.id DESC`
  );
  return {
    running,
    items: rows.map((r) => ({
      reviewId: r.review_id,
      title: r.title || `#${r.review_id}`,
      vendor: r.vendor,
      status: r.review_state === 'published' ? 'published' : r.status,
      error: r.error,
      attempts: r.attempts,
      shopify_product_id: r.shopify_product_id,
    })),
  };
}

function resumeUnfinished() {
  // Anything queued/publishing in publish_log whose review row is still
  // 'approved' gets picked up again after a restart.
  kick();
}

// ── worker ─────────────────────────────────────────────────────────────────────
function kick() {
  if (running) return;
  running = true;
  workLoop()
    .catch((e) => console.error('shopify queue error:', e.message))
    .finally(() => { running = false; collectionCache = null; });
}

async function workLoop() {
  collectionCache = null;
  let published = 0;
  let failed = 0;
  for (;;) {
    const { rows } = await db.query(
      `SELECT DISTINCT ON (pl.review_id) pl.id AS log_id, pl.review_id, pl.attempts, pl.status
       FROM publish_log pl
       JOIN review_queue rq ON rq.id = pl.review_id
       WHERE rq.state = 'approved' AND pl.status IN ('queued', 'retrying')
       ORDER BY pl.review_id, pl.id DESC
       LIMIT 1`
    );
    if (!rows.length) break;
    const item = rows[0];

    const review = await db.query('SELECT * FROM review_queue WHERE id = $1', [item.review_id]);
    if (!review.rows.length) {
      await db.query(`UPDATE publish_log SET status = 'failed', error = 'review row gone', finished_at = now() WHERE id = $1`, [item.log_id]);
      continue;
    }

    let attempt = item.attempts;
    let done = false;
    let lastError = null;
    while (attempt < MAX_ATTEMPTS && !done) {
      attempt++;
      await db.query(`UPDATE publish_log SET status = 'publishing', attempts = $2 WHERE id = $1`, [item.log_id, attempt]);
      try {
        const productId = await publishOne(review.rows[0]);
        await db.query(
          `UPDATE publish_log SET status = 'published', shopify_product_id = $2, error = NULL, finished_at = now() WHERE id = $1`,
          [item.log_id, productId]
        );
        await db.query(`UPDATE review_queue SET state = 'published' WHERE id = $1`, [item.review_id]);
        await db.query(`UPDATE images SET status = 'onboarded' WHERE hash = ANY($1)`,
          [review.rows[0].image_hashes || []]);
        published++;
        done = true;
      } catch (e) {
        lastError = e.message;
        console.error(`publish #${item.review_id} attempt ${attempt} failed:`, e.message);
        if (attempt < MAX_ATTEMPTS) {
          await db.query(`UPDATE publish_log SET status = 'retrying', error = $2 WHERE id = $1`, [item.log_id, lastError]);
          await sleep(2000 * 2 ** (attempt - 1)); // 2s, 4s exponential backoff
        }
      }
    }
    if (!done) {
      failed++;
      await db.query(
        `UPDATE publish_log SET status = 'failed', error = $2, finished_at = now() WHERE id = $1`,
        [item.log_id, lastError]
      );
      await db.query(`UPDATE review_queue SET state = 'failed' WHERE id = $1`, [item.review_id]);
    }
  }

  if (published || failed) {
    const text = [`🚀 UKSC publish complete`, `✅ ${published} published`]
      .concat(failed ? [`❌ ${failed} failed — see Queue tab`] : [])
      .concat([`\n${process.env.APP_URL || 'http://localhost:3000'}`]).join('\n');
    try { await require('./userbot').sendSavedMessage(text); } catch {}
  }
}

// ── single product ─────────────────────────────────────────────────────────────
async function publishOne(row) {
  const colours = String(row.colours || '').split(',').map((s) => s.trim()).filter(Boolean);
  const sizes = String(row.sizes || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!colours.length || !sizes.length) throw new Error('Missing colours or sizes');
  if (row.price == null) throw new Error('Missing price');

  // 1. staged uploads for the product photos
  const mediaUrls = [];
  for (const hash of row.image_hashes || []) {
    const img = await db.query('SELECT file_path FROM images WHERE hash = $1', [hash]);
    if (!img.rows.length) continue;
    try {
      const url = await stagedUpload(`${hash}.jpg`, img.rows[0].file_path);
      if (url) mediaUrls.push(url);
    } catch (e) {
      console.error(`staged upload failed for ${hash}:`, e.message);
    }
  }

  // 2. productCreate with options + variants = sizes × colours
  const variants = [];
  for (const colour of colours) {
    for (const size of sizes) {
      variants.push({ price: String(row.price), options: [size, colour], inventoryPolicy: 'CONTINUE' });
    }
  }

  const d = await gql(
    `mutation productCreate($input: ProductInput!, $media: [CreateMediaInput!]) {
       productCreate(input: $input, media: $media) {
         product { id }
         userErrors { field message }
       }
     }`,
    {
      input: {
        title: row.title,
        vendor: row.vendor,
        productType: row.product_type,
        status: PUBLISH_STATUS,
        tags: [row.vendor, row.product_type],
        options: ['Size', 'Colour'],
        variants,
      },
      media: mediaUrls.map((url) => ({ originalSource: url, mediaContentType: 'IMAGE' })),
    }
  );
  const errors = d.productCreate?.userErrors;
  if (errors?.length) throw new Error(errors.map((e) => e.message).join(', '));
  const productId = d.productCreate?.product?.id;
  if (!productId) throw new Error('productCreate returned no product id');

  // 3. add to collection (IDs cached once per run)
  if (row.collection && !row.collection.includes('⚠️')) {
    const colId = await getCollectionId(row.collection);
    if (colId) {
      const add = await gql(
        `mutation collectionAddProducts($id: ID!, $productIds: [ID!]!) {
           collectionAddProducts(id: $id, productIds: $productIds) { userErrors { message } }
         }`,
        { id: colId, productIds: [productId] }
      );
      const errs = add.collectionAddProducts?.userErrors;
      if (errs?.length) console.error('collection add warning:', errs.map((e) => e.message).join(', '));
    } else {
      console.error(`collection not found on Shopify: ${row.collection}`);
    }
  }

  return productId;
}

async function stagedUpload(filename, filePath) {
  const bytes = fs.readFileSync(filePath);
  const d = await gql(
    `mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
       stagedUploadsCreate(input: $input) {
         stagedTargets { url resourceUrl parameters { name value } }
         userErrors { message }
       }
     }`,
    { input: [{ filename, mimeType: 'image/jpeg', resource: 'IMAGE', httpMethod: 'POST' }] }
  );
  const target = d.stagedUploadsCreate?.stagedTargets?.[0];
  if (!target) throw new Error('stagedUploadsCreate returned no target');

  const form = new FormData();
  for (const p of target.parameters) form.append(p.name, p.value);
  form.append('file', new Blob([bytes], { type: 'image/jpeg' }), filename);
  const up = await fetch(target.url, { method: 'POST', body: form });
  if (!up.ok) throw new Error(`staged upload POST ${up.status}`);
  return target.resourceUrl;
}

async function getCollectionId(title) {
  if (!collectionCache) {
    const d = await gql(`{ collections(first: 100) { edges { node { id title } } } }`);
    collectionCache = {};
    for (const e of d.collections?.edges || []) {
      collectionCache[e.node.title.toLowerCase()] = e.node.id;
    }
  }
  const want = title.toLowerCase();
  if (collectionCache[want]) return collectionCache[want];
  const partial = Object.keys(collectionCache).find((t) => t.includes(want) || want.includes(t));
  return partial ? collectionCache[partial] : null;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

module.exports = { enqueue, getStatus, resumeUnfinished };
