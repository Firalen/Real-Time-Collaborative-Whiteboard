const pool = require('../db/pool');

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;

async function getPlans() {
  const { rows } = await pool.query(
    `SELECT * FROM subscription_plans WHERE active = true ORDER BY sort_order`,
  );
  return rows;
}

async function getWorkspaceSubscription(workspaceId) {
  const { rows } = await pool.query(
    `SELECT s.*, p.slug AS plan_slug, p.name AS plan_name, p.limits, p.features
     FROM subscriptions s
     JOIN subscription_plans p ON p.id = s.plan_id
     WHERE s.workspace_id = $1`,
    [workspaceId],
  );
  return rows[0] || null;
}

async function ensureFreeSubscription(workspaceId) {
  const existing = await getWorkspaceSubscription(workspaceId);
  if (existing) return existing;

  const { rows: plans } = await pool.query(
    `SELECT id FROM subscription_plans WHERE slug = 'free' LIMIT 1`,
  );
  if (!plans[0]) return null;

  const { rows } = await pool.query(
    `INSERT INTO subscriptions (workspace_id, plan_id, status, trial_ends_at)
     VALUES ($1, $2, 'trialing', NOW() + INTERVAL '14 days')
     RETURNING *`,
    [workspaceId, plans[0].id],
  );
  return rows[0];
}

async function checkLimit(workspaceId, metric) {
  const sub = await getWorkspaceSubscription(workspaceId);
  if (!sub) return { allowed: true, limit: -1, used: 0 };

  const limits = sub.limits || {};
  const limit = limits[metric];
  if (limit === undefined || limit === -1) return { allowed: true, limit: -1, used: 0 };

  const { rows } = await pool.query(
    `SELECT COALESCE(SUM(value), 0)::int AS total FROM usage_records
     WHERE workspace_id = $1 AND metric = $2
       AND recorded_at > NOW() - INTERVAL '30 days'`,
    [workspaceId, metric],
  );
  const used = rows[0].total;
  return { allowed: used < limit, limit, used };
}

async function recordUsage(workspaceId, metric, value = 1) {
  await pool.query(
    `INSERT INTO usage_records (workspace_id, metric, value) VALUES ($1, $2, $3)`,
    [workspaceId, metric, value],
  );
}

async function createCheckoutSession({ workspaceId, planSlug, billingCycle, successUrl, cancelUrl }) {
  if (!STRIPE_KEY) throw new Error('STRIPE_SECRET_KEY is not configured');

  const { rows: plans } = await pool.query(
    `SELECT * FROM subscription_plans WHERE slug = $1`,
    [planSlug],
  );
  const plan = plans[0];
  if (!plan) throw new Error('Plan not found');

  const priceId = billingCycle === 'annual'
    ? plan.stripe_price_annual_id
    : plan.stripe_price_monthly_id;
  if (!priceId) {
    throw new Error(
      `Stripe price not configured for plan "${planSlug}" (${billingCycle}). ` +
      'Run: cd server && npm run stripe:sync (with STRIPE_SECRET_KEY and DATABASE_URL set).',
    );
  }

  const Stripe = require('stripe');
  const stripe = new Stripe(STRIPE_KEY);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { workspaceId, planSlug },
  });
  return session;
}

async function getInvoices(workspaceId) {
  const { rows } = await pool.query(
    `SELECT * FROM invoices WHERE workspace_id = $1 ORDER BY created_at DESC LIMIT 24`,
    [workspaceId],
  );
  return rows;
}

module.exports = {
  getPlans,
  getWorkspaceSubscription,
  ensureFreeSubscription,
  checkLimit,
  recordUsage,
  createCheckoutSession,
  getInvoices,
};
