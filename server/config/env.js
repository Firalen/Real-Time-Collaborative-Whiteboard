function validateEnv() {
  const isProduction = process.env.NODE_ENV === 'production';
  const required = ['JWT_SECRET', 'DATABASE_URL'];

  if (isProduction) {
    required.push('CLIENT_URL');
  }

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (isProduction && process.env.JWT_SECRET === 'change-me-in-production-use-long-random-string') {
    throw new Error('JWT_SECRET must be changed in production');
  }
}

module.exports = { validateEnv };
