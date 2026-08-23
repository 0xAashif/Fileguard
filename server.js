/**
 * @file server.js
 * @description FileGuard Express Server — Production Entry Point.
 *
 * ARCHITECTURE:
 * 1. Defense-in-Depth Pipeline: Helmet → CORS → Rate Limiters → Routes
 * 2. Request Telemetry: Every API request gets a unique ID and timing header
 * 3. Graceful Shutdown: SIGTERM/SIGINT close DB connections before exit
 * 4. Static File Serving: In production, serves the React build from client/dist
 *
 * STARTUP SEQUENCE:
 *   dotenv → DB connect → middleware stack → routes → static files → listen
 */

import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { connectDB, disconnectDB } from './config/db.js';
import { helmetConfig, corsConfig } from './config/security.js';
import { errorHandler } from './middlewares/errorHandler.js';
import apiRouter from './routes/documentRoutes.js';
import authRouter from './routes/authRoutes.js';
import adminRouter from './routes/adminRoutes.js';

// ── ES Module __dirname equivalent ──
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

async function startServer() {
  const app = express();

  // ── 0. Pre-flight Environment Checks ──
  if (!process.env.JWT_SECRET) {
    console.error('[FATAL] JWT_SECRET environment variable is missing.');
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    console.error('[FATAL] MONGODB_URI environment variable is missing.');
    process.exit(1);
  }

  // ── 1. Connect to MongoDB ──
  await connectDB();

  // ── 2. Trust proxy (required behind Render/Railway/Nginx) ──
  app.set('trust proxy', 1);

  // ── 3. Security Headers (OWASP) ──
  if (NODE_ENV === 'production') {
    app.use(helmet(helmetConfig));
  }

  // ── 4. CORS ──
  app.use(cors(corsConfig));

  // ── 5. Request Logging ──
  app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

  // ── 6. Body Parsing (with size limits to prevent DoS) ──
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // ── 7. Request ID & Timing Middleware ──
  // Every request gets a unique ID for tracing through logs,
  // and a header showing how long the server took to process it.
  app.use((req, res, next) => {
    const startTime = process.hrtime.bigint();
    const requestId = `fg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // Set request ID header before the response is sent
    res.setHeader('X-Request-ID', requestId);

    // Log processing time after response completes
    // NOTE: Cannot setHeader inside 'finish' — response is already sent
    res.on('finish', () => {
      const elapsed = Number(process.hrtime.bigint() - startTime) / 1_000_000;
      if (req.path.startsWith('/api')) {
        console.log(`[API] ${req.method} ${req.originalUrl} → ${res.statusCode} (${elapsed.toFixed(2)}ms)`);
      }
    });

    next();
  });

  // ── 8. API Routes ──
  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api', apiRouter);

  // ── 9. Serve React Frontend (Production) ──
  if (NODE_ENV === 'production') {
    const clientBuild = path.join(__dirname, 'client', 'dist');
    app.use(express.static(clientBuild));

    // SPA catch-all: any non-API route serves index.html
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientBuild, 'index.html'));
    });
  }

  // ── 10. Centralized Error Handler ──
  app.use(errorHandler);

  // ── 11. Start Listening ──
  const server = app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════╗
║           FileGuard Server Online            ║
╠══════════════════════════════════════════════╣
║  Port:        ${String(PORT).padEnd(30)}║
║  Environment: ${NODE_ENV.padEnd(30)}║
║  API:         http://localhost:${PORT}/api/health  ║
╚══════════════════════════════════════════════╝
    `);
  });

  // ── 12. Graceful Shutdown ──
  // When the process receives a termination signal (e.g., Render deploy),
  // we close the HTTP server and database connections cleanly.
  const shutdown = async (signal) => {
    console.log(`\n[Server] ${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await disconnectDB();
      console.log('[Server] Goodbye.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
