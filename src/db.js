// Postgres via pg (Neon, external DATABASE_URL, SSL required).
// bootstrap() runs on boot: creates tables if absent and seeds price_rules.

const { Pool } = require('pg');
const { PRICE_SEED, COLLECTION_MAP } = require('./vendors');

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL is not set (Neon connection string).');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Neon requires TLS; its endpoints use certs that node's default CA bundle
  // doesn't always chain, so don't reject on that. sslmode=disable (local dev)
  // turns TLS off entirely.
  ssl: process.env.DATABASE_URL.includes('sslmode=disable')
    ? false
    : { rejectUnauthorized: false },
  max: 5,
});

pool.on('error', (err) => console.error('pg pool error:', err.message));

const SCHEMA = `
CREATE TABLE IF NOT EXISTS images (
  hash         TEXT PRIMARY KEY,
  vendor       TEXT,
  source       TEXT,
  tg_chat_id   BIGINT,
  tg_msg_id    BIGINT,
  file_path    TEXT,
  received_at  TIMESTAMPTZ DEFAULT now(),
  status       TEXT CHECK (status IN
    ('pending_analysis','analysing','analysed','onboarded','skipped'))
);

CREATE TABLE IF NOT EXISTS analyses (
  hash         TEXT PRIMARY KEY REFERENCES images(hash),
  analysis     JSONB,
  model        TEXT,
  cached_hits  INT DEFAULT 0,
  analysed_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS review_queue (
  id           SERIAL PRIMARY KEY,
  vendor       TEXT,
  title        TEXT,
  product_type TEXT,
  collection   TEXT,
  colours      TEXT,
  sizes        TEXT,
  price        NUMERIC NULL,
  confidence   TEXT,
  notes        TEXT,
  image_hashes TEXT[],
  state        TEXT CHECK (state IN
    ('needs_review','auto_ready','approved','published','failed')),
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vendor_chats (
  tg_chat_id   BIGINT PRIMARY KEY,
  vendor       TEXT,
  chat_title   TEXT,
  mapped_at    TIMESTAMPTZ DEFAULT now()
);

-- A worker-declared batch: one leading text message ("instructions") that a
-- run of photos from a worker chat gets attached to. See userbot.js
-- openBatches / vendor_chats.is_worker.
CREATE TABLE IF NOT EXISTS batches (
  id            SERIAL PRIMARY KEY,
  tg_chat_id    BIGINT,
  vendor        TEXT,
  instructions  TEXT,
  started_at    TIMESTAMPTZ DEFAULT now(),
  last_photo_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS price_rules (
  product_type TEXT PRIMARY KEY,
  price        NUMERIC
);

-- Manager-editable product_type -> Shopify collection defaults (Settings ->
-- collection mapping). Seeded from vendors.COLLECTION_MAP; overrides it once
-- a row exists, same pattern as price_rules/PRICE_SEED.
CREATE TABLE IF NOT EXISTS collection_rules (
  product_type TEXT PRIMARY KEY,
  collection   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS publish_log (
  id                 SERIAL PRIMARY KEY,
  review_id          INT,
  shopify_product_id TEXT,
  status             TEXT,
  error              TEXT,
  attempts           INT,
  finished_at        TIMESTAMPTZ
);

-- One row per AI batch request (one product candidate), so we can show
-- running spend without ever needing Anthropic's (nonexistent) balance API.
CREATE TABLE IF NOT EXISTS ai_usage (
  id            SERIAL PRIMARY KEY,
  batch_id      TEXT,
  model         TEXT,
  input_tokens  INT,
  output_tokens INT,
  cost_usd      NUMERIC,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_images_status   ON images(status);
CREATE INDEX IF NOT EXISTS idx_images_received ON images(received_at);
CREATE INDEX IF NOT EXISTS idx_review_state    ON review_queue(state);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON ai_usage(created_at);
`;

// Per-listing AI-generated marketing content: { seoTitle, seoDescription,
// descriptionHtml, tags[], altText, socialCaption, emailBlurb, adHeadline,
// adPrimaryText }. ALTER (not part of CREATE TABLE) so it lands on the
// review_queue table that already exists in deployed databases.
const MIGRATIONS = [
  `ALTER TABLE review_queue ADD COLUMN IF NOT EXISTS marketing JSONB`,
  // Worker-submitted batches: a chat flagged is_worker treats a leading
  // text-only message as instructions for the photos that follow (batches
  // table above), which get tagged onto images.batch_id and surfaced back
  // on the resulting listing as review_queue.worker_note.
  `ALTER TABLE vendor_chats ADD COLUMN IF NOT EXISTS is_worker BOOLEAN DEFAULT false`,
  `ALTER TABLE images ADD COLUMN IF NOT EXISTS batch_id INT REFERENCES batches(id)`,
  `ALTER TABLE review_queue ADD COLUMN IF NOT EXISTS worker_note TEXT`,
];

async function bootstrap() {
  await pool.query(SCHEMA);
  for (const m of MIGRATIONS) await pool.query(m);
  for (const [type, price] of Object.entries(PRICE_SEED)) {
    await pool.query(
      `INSERT INTO price_rules (product_type, price)
       VALUES ($1, $2) ON CONFLICT (product_type) DO NOTHING`,
      [type, price]
    );
  }
  for (const [type, collection] of Object.entries(COLLECTION_MAP)) {
    await pool.query(
      `INSERT INTO collection_rules (product_type, collection)
       VALUES ($1, $2) ON CONFLICT (product_type) DO NOTHING`,
      [type, collection]
    );
  }
  console.log('db: schema ready, price_rules + collection_rules seeded');
}

module.exports = {
  pool,
  bootstrap,
  query: (text, params) => pool.query(text, params),
};
