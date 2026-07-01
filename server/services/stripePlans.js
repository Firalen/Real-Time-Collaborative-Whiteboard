const pool = require('../db/pool');

async function findProduct(stripe, planSlug) {
  const result = await stripe.products.search({
    query: `metadata['plan_slug']:'${planSlug}'`,
  });
  return result.data[0] || null;
}

async function syncPlan(stripe, plan) {
  if (plan.price_monthly_cents <= 0 && plan.price_annual_cents <= 0) {
    return { slug: plan.slug, skipped: true };
  }

  let product = await findProduct(stripe, plan.slug);
  if (!product) {
    product = await stripe.products.create({
      name: `CollabBoard ${plan.name}`,
      description: plan.description || undefined,
      metadata: { plan_slug: plan.slug },
    });
    console.log(`Stripe: created product for ${plan.slug} (${product.id})`);
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
    console.log(`Stripe: monthly price for ${plan.slug}: ${monthlyId}`);
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
    console.log(`Stripe: annual price for ${plan.slug}: ${annualId}`);
  }

  await pool.query(
    `UPDATE subscription_plans
     SET stripe_price_monthly_id = COALESCE($2, stripe_price_monthly_id),
         stripe_price_annual_id = COALESCE($3, stripe_price_annual_id)
     WHERE id = $1`,
    [plan.id, monthlyId, annualId],
  );

  return { slug: plan.slug, monthlyId, annualId };
}

async function syncStripePlansIfNeeded() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return;

  const { rows: missing } = await pool.query(
    `SELECT id FROM subscription_plans
     WHERE active = true AND slug IN ('pro', 'business')
       AND price_monthly_cents > 0
       AND (stripe_price_monthly_id IS NULL OR stripe_price_annual_id IS NULL)
     LIMIT 1`,
  );
  if (missing.length === 0) return;

  const Stripe = require('stripe');
  const stripe = new Stripe(key);
  const { rows: plans } = await pool.query(
    `SELECT * FROM subscription_plans WHERE active = true AND slug IN ('pro', 'business') ORDER BY sort_order`,
  );

  console.log('Syncing Stripe prices for subscription plans...');
  for (const plan of plans) {
    await syncPlan(stripe, plan);
  }
  console.log('Stripe plan sync complete.');
}

module.exports = { syncStripePlansIfNeeded, syncPlan };
