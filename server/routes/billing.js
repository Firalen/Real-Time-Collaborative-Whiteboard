const express = require('express');
const billing = require('../services/billing');
const { authMiddleware } = require('../middleware/auth');
const { requireWorkspaceRole } = require('../middleware/workspaceAuth');

const router = express.Router();

router.get('/plans', async (_req, res) => {
  try {
    const plans = await billing.getPlans();
    res.json(plans.map(formatPlan));
  } catch {
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

router.get('/workspace/:workspaceId', authMiddleware, async (req, res) => {
  try {
    const sub = await billing.getWorkspaceSubscription(req.params.workspaceId);
    if (!sub) {
      await billing.ensureFreeSubscription(req.params.workspaceId);
      const created = await billing.getWorkspaceSubscription(req.params.workspaceId);
      return res.json(created ? formatSubscription(created) : null);
    }
    res.json(formatSubscription(sub));
  } catch {
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

router.get('/workspace/:workspaceId/usage', authMiddleware, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const [boards, ai] = await Promise.all([
      billing.checkLimit(workspaceId, 'boards'),
      billing.checkLimit(workspaceId, 'ai_requests_monthly'),
    ]);
    res.json({ boards, ai_requests_monthly: ai });
  } catch {
    res.status(500).json({ error: 'Failed to fetch usage' });
  }
});

router.post(
  '/workspace/:workspaceId/checkout',
  authMiddleware,
  requireWorkspaceRole('admin'),
  async (req, res) => {
    try {
      const { planSlug, billingCycle = 'monthly' } = req.body;
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const session = await billing.createCheckoutSession({
        workspaceId: req.params.workspaceId,
        planSlug,
        billingCycle,
        successUrl: `${clientUrl}/workspace/${req.params.workspaceId}?billing=success`,
        cancelUrl: `${clientUrl}/workspace/${req.params.workspaceId}?billing=canceled`,
      });
      res.json({ url: session.url });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Checkout failed' });
    }
  },
);

router.get('/workspace/:workspaceId/invoices', authMiddleware, async (req, res) => {
  try {
    const invoices = await billing.getInvoices(req.params.workspaceId);
    res.json(invoices);
  } catch {
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

function formatPlan(p) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    priceMonthly: p.price_monthly_cents / 100,
    priceAnnual: p.price_annual_cents / 100,
    limits: p.limits,
    features: p.features,
  };
}

function formatSubscription(s) {
  return {
    id: s.id,
    workspaceId: s.workspace_id,
    planSlug: s.plan_slug,
    planName: s.plan_name,
    status: s.status,
    billingCycle: s.billing_cycle,
    trialEndsAt: s.trial_ends_at,
    currentPeriodEnd: s.current_period_end,
    limits: s.limits,
    features: s.features,
  };
}

module.exports = router;
