const { Pool } = require('pg');

function resolveSsl() {
  if (process.env.DATABASE_SSL === 'false') return false;
  if (process.env.DATABASE_SSL === 'true') {
    return { rejectUnauthorized: false };
  }
  const url = process.env.DATABASE_URL || '';
  // Hosted Postgres (Render, Railway, Supabase, etc.) requires SSL
  if (
    process.env.NODE_ENV === 'production'
    || /render\.com|railway\.app|supabase\.co|neon\.tech|amazonaws\.com/i.test(url)
    || url.includes('sslmode=require')
  ) {
    return { rejectUnauthorized: false };
  }
  return false;
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: resolveSsl(),
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

module.exports = pool;
module.exports.resolveSsl = resolveSsl;
