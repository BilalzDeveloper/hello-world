// Quick Codespaces sanity check: connects to Neon, runs bootstrap, prints tables.
// Usage:  DATABASE_URL=postgres://... node scripts/db-check.js   (or put it in .env)

require('dotenv').config();
const db = require('../src/db');

(async () => {
  await db.bootstrap();
  const { rows } = await db.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' ORDER BY table_name`
  );
  console.log('tables:', rows.map((r) => r.table_name).join(', '));
  const prices = await db.query('SELECT product_type, price FROM price_rules ORDER BY product_type');
  console.log('price_rules:');
  for (const r of prices.rows) console.log(`  ${r.product_type}: £${r.price}`);
  await db.pool.end();
  console.log('DB OK ✓');
})().catch((e) => {
  console.error('DB check failed:', e.message);
  process.exit(1);
});
