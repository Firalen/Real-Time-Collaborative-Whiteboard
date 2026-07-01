/**
 * Create Stripe products/prices for Pro & Business plans and save price IDs to the database.
 *
 * Usage (from server/):
 *   npm run stripe:sync
 *
 * Requires STRIPE_SECRET_KEY and DATABASE_URL in .env (use Render External URL from your PC).
 */
require('dotenv').config();
const Stripe = require('stripe');
const pool = require('../db/pool');

async function findProduct(stripe, planSlug) {
  const result = await stripe.products.search({
    query: `metadata['plan_slug']:'${planSlug}'`,
  });
  return result.data[0] || null;
}

async function syncPlan(stripe, plan) {
  if (plan.price_monthly_cents <= 0 && plan.price_annual_cents <= 0) {
    console.log(`⊘ Skipping ${plan.slug} (no paid pricing)`);
    return;
  }

  let product = await findProduct(stripe, plan.slug);
  if (!product) {
    product = await stripe.products.create({
      name: `CollabBoard ${plan.name}`,
      description: plan.description || undefined,
      metadata: { plan_slug: plan.slug },
    });
    console.log(`✓ Created Stripe product for ${plan.slug}: ${product.id}`);
  } else {
    console.log(`✓ Found Stripe product for ${plan.slug}: ${product.id}`);
  }

  let monthlyId = plan.stripe_price_monthly_id;
  let annualId = plan.stripe_price_annual_id;

  if (!monthlyId && plan.price_monthly_cents > 0) {
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.price_monthly_cents,
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: { plan_slug: plan.slug, billing_cycle: 'monthly' },
    });
    monthlyId = price.id;
    console.log(`  + Monthly price $${plan.price_monthly_cents / 100}/mo: ${monthlyId}`);
  }

  if (!annualId && plan.price_annual_cents > 0) {
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.price_annual_cents,
      currency: 'usd',
      recurring: { interval: 'year' },
      metadata: { plan_slug: plan.slug, billing_cycle: 'annual' },
    });
    annualId = price.id;
    console.log(`  + Annual price $${plan.price_annual_cents / 100}/yr: ${annualId}`);
  }

  await pool.query(
    `UPDATE subscription_plans
     SET stripe_price_monthly_id = COALESCE($2, stripe_price_monthly_id),
         stripe_price_annual_id = COALESCE($3, stripe_price_annual_id)
     WHERE id = $1`,
    [plan.id, monthlyId, annualId],
  );
  console.log(`✓ Database updated for ${plan.slug}`);
}

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
    await syncPlan(stripe, plan);
  }

  console.log('\nDone. Billing checkout should work now.');
  await pool.end();
}

main().catch((err) => {
  console.error('Stripe sync failed:', err.message);
  process.exit(1);
});
