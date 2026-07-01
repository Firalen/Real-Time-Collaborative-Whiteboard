function validateEnv() {
  const isProduction = process.env.NODE_ENV === 'production';
  const isRender = process.env.RENDER === 'true';
  const required = ['JWT_SECRET', 'DATABASE_URL'];

  if (isProduction) {
    required.push('CLIENT_URL');
  }

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const dbUrl = process.env.DATABASE_URL || '';
  if ((isProduction || isRender) && /localhost|127\.0\.0\.1/i.test(dbUrl)) {
    throw new Error(
      'DATABASE_URL points to localhost. On Render, use the Internal Database URL from your Postgres service (not localhost).',
    );
  }

  if (isProduction && process.env.JWT_SECRET === 'change-me-in-production-use-long-random-string') {
    throw new Error('JWT_SECRET must be changed in production');
  }

  if (isRender && !isProduction) {
    console.warn(
      '[Render] NODE_ENV is not "production". Set NODE_ENV=production in Render Environment for migrations and SSL.',
    );
  }
}

function isDeployed() {
  return process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
}

module.exports = { validateEnv, isDeployed };
