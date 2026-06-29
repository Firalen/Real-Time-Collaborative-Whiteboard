require('dotenv').config();
const { Pool } = require('pg');
const pool = require('./pool');
const schemaV2 = require('./schema-v2');
const seedWorkspaces = require('./seed-workspaces');

async function ensureDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');

  const url = new URL(databaseUrl);
  const dbName = url.pathname.replace(/^\//, '');
  url.pathname = '/postgres';

  const adminPool = new Pool({
    connectionString: url.toString(),
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    const { rows } = await adminPool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName],
    );
    if (rows.length === 0) {
      await adminPool.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Created database: ${dbName}`);
    }
  } finally {
    await adminPool.end();
  }
}

async function migrateV1(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      avatar_color VARCHAR(7) DEFAULT '#6366f1',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS boards (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
      canvas_data JSONB DEFAULT '{"version":"6.0.0","objects":[]}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_boards_owner ON boards(owner_id);
  `);
  console.log('✓ Migration v1 (core tables)');
}

async function migrateV2(client) {
  await client.query(schemaV2);
  console.log('✓ Migration v2 (SaaS schema)');
  await client.query(seedWorkspaces);
  console.log('✓ Seeded personal workspaces for existing users');
}

async function migrate() {
  await ensureDatabase();

  const client = await pool.connect();
  try {
    await migrateV1(client);
    await migrateV2(client);
    console.log('All migrations completed successfully.');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
