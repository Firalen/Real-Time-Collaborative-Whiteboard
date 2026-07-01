/**
 * Create Stripe products/prices for Pro & Business plans and save price IDs to the database.
 *
 * Usage (from server/):
 *   npm run stripe:sync
 *
 * Requires STRIPE_SECRET_KEY and DATABASE_URL in .env (use Render External URL from your PC).
 */
require('dotenv').config();
const pool = require('../db/pool');
const { syncPlan } = require('../services/stripePlans');

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error('Missing STRIPE_SECRET_KEY in environment');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('Missing DATABASE_URL in environment');
    process.exit(1);
  }

  const Stripe = require('stripe');
  const stripe = new Stripe(key);
  const { rows: plans } = await pool.query(
    `SELECT * FROM subscription_plans WHERE active = true AND slug IN ('pro', 'business') ORDER BY sort_order`,
  );

  if (plans.length === 0) {
    console.error('No pro/business plans in database. Run npm run db:migrate first.');
    process.exit(1);
  }

  console.log(`Syncing ${plans.length} plan(s) to Stripe (${key.startsWith('sk_live') ? 'LIVE' : 'TEST'} mode)...\n`);

  for (const plan of plans) {
    const result = await syncPlan(stripe, plan);
    if (result.skipped) {
      console.log(`⊘ Skipping ${result.slug} (no paid pricing)`);
    } else {
      console.log(`✓ Database updated for ${result.slug}`);
    }
  }

  console.log('\nDone. Billing checkout should work now.');
  await pool.end();
}

main().catch((err) => {
  console.error('Stripe sync failed:', err.message);
  process.exit(1);
});
