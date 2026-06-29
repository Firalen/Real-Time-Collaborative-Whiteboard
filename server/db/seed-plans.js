/**
 * Seed default subscription plans (Free / Pro / Business / Enterprise).
 */
module.exports = `
  INSERT INTO subscription_plans (slug, name, description, price_monthly_cents, price_annual_cents, limits, features, sort_order)
  VALUES
    ('free', 'Free', 'For individuals getting started', 0, 0,
     '{"boards":3,"members":3,"storage_mb":100,"ai_requests_monthly":10}'::jsonb,
     '["basic_canvas","realtime","comments"]'::jsonb, 0),
    ('pro', 'Pro', 'For teams that collaborate daily', 1200, 12000,
     '{"boards":50,"members":25,"storage_mb":5000,"ai_requests_monthly":500}'::jsonb,
     '["templates","tasks","integrations","version_history","presentation"]'::jsonb, 1),
    ('business', 'Business', 'Advanced security and admin controls', 2900, 29000,
     '{"boards":200,"members":100,"storage_mb":50000,"ai_requests_monthly":2000}'::jsonb,
     '["sso","audit_logs","ip_allowlist","api_keys","brand_kit"]'::jsonb, 2),
    ('enterprise', 'Enterprise', 'Custom limits, SLA, and compliance', 0, 0,
     '{"boards":-1,"members":-1,"storage_mb":-1,"ai_requests_monthly":-1}'::jsonb,
     '["saml","e2e_encryption","data_residency","dedicated_support","custom_contract"]'::jsonb, 3)
  ON CONFLICT (slug) DO NOTHING;

  INSERT INTO feature_flags (key, description, enabled_globally, plan_slugs)
  VALUES
    ('ai_features', 'AI mind maps, summarizer, image gen', true, '{pro,business,enterprise}'),
    ('presentation_mode', 'Presentation and follow-me', true, '{pro,business,enterprise}'),
    ('webrtc_calls', 'In-board video calls', false, '{business,enterprise}'),
    ('marketplace', 'Template marketplace', true, '{pro,business,enterprise}'),
    ('offline_mode', 'PWA offline sync', true, '{pro,business,enterprise}')
  ON CONFLICT (key) DO NOTHING;
`;
