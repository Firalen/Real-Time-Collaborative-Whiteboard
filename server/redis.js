const Redis = require('ioredis');

let redis = null;
let memoryStore = new Map();

function createRedisClient() {
  if (!process.env.REDIS_URL) {
    console.warn('REDIS_URL not set — using in-memory store (not suitable for multi-instance production)');
    return null;
  }

  const client = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  client.on('error', (err) => {
    console.error('Redis error:', err.message);
  });

  return client;
}

async function connectRedis() {
  redis = createRedisClient();
  if (!redis) return;

  try {
    await redis.connect();
    await redis.ping();
    console.log('Connected to Redis');
  } catch (err) {
    console.warn('Redis connection failed, using in-memory fallback:', err.message);
    try {
      redis.disconnect();
    } catch {
      // ignore disconnect errors
    }
    redis = null;
  }
}

async function setWithExpiry(key, value, ttlSeconds) {
  if (redis) {
    await redis.set(key, value, 'EX', ttlSeconds);
  } else {
    memoryStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }
}

async function get(key) {
  if (redis) {
    return redis.get(key);
  }
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
}

async function del(key) {
  if (redis) {
    await redis.del(key);
  } else {
    memoryStore.delete(key);
  }
}

async function sadd(key, member) {
  if (redis) {
    await redis.sadd(key, member);
  } else {
    const set = memoryStore.get(key)?.value || new Set();
    set.add(member);
    memoryStore.set(key, { value: set, expiresAt: Infinity });
  }
}

async function srem(key, member) {
  if (redis) {
    await redis.srem(key, member);
  } else {
    const entry = memoryStore.get(key);
    if (entry?.value instanceof Set) {
      entry.value.delete(member);
    }
  }
}

async function smembers(key) {
  if (redis) {
    return redis.smembers(key);
  }
  const entry = memoryStore.get(key);
  return entry?.value instanceof Set ? Array.from(entry.value) : [];
}

module.exports = {
  connectRedis,
  setWithExpiry,
  get,
  del,
  sadd,
  srem,
  smembers,
};
