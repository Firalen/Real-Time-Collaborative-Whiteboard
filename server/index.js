require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');

const { validateEnv } = require('./config/env');
const pool = require('./db/pool');
const { connectRedis } = require('./redis');
const authRoutes = require('./routes/auth');
const boardRoutes = require('./routes/boards');
const { authLimiter, apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const { registerSocketHandlers } = require('./socket/handlers');

validateEnv();

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use('/api', apiLimiter);

app.get('/health', async (_req, res) => {
  const health = { status: 'ok', timestamp: new Date().toISOString(), db: 'unknown' };
  try {
    await pool.query('SELECT 1');
    health.db = 'connected';
    res.json(health);
  } catch {
    health.status = 'degraded';
    health.db = 'disconnected';
    res.status(503).json(health);
  }
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/boards', boardRoutes);

registerSocketHandlers(io);

app.use(errorHandler);

const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log('Connected to PostgreSQL');
  } catch (err) {
    console.error('PostgreSQL connection failed:', err.message);
    if (isProduction) {
      process.exit(1);
    }
    console.error('Run migrations: npm run db:migrate');
  }

  try {
    await connectRedis();
  } catch (err) {
    console.warn('Redis unavailable, using in-memory fallback:', err.message);
  }

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Stop the other process or change PORT in .env`);
    } else {
      console.error('Server error:', err.message);
    }
    process.exit(1);
  });

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });
}

function shutdown(signal) {
  console.log(`${signal} received — shutting down gracefully`);
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
