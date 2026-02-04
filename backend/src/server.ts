/**
 * Vitality Core Backend Server
 * 
 * Express server with tRPC integration for type-safe API.
 * 
 * Architecture:
 * - Express handles middleware, static files, health checks
 * - tRPC handles all API routes at /trpc/*
 * - Context extracts auth/tenant from JWT automatically
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from './trpc/router.js';
import { createContext } from './trpc/context.js';
import { isDatabaseReady, closeDatabase } from './db/index.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================================
// Middleware
// ============================================================================

app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:3003'],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' })); // Larger limit for bulk imports
app.use(express.urlencoded({ extended: true }));

// Request logging (development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    });
    next();
  });
}

// ============================================================================
// Health & Status Routes (outside tRPC)
// ============================================================================

/**
 * Health check endpoint
 * Used by load balancers, container orchestration, monitoring
 */
app.get('/health', (req, res) => {
  const dbReady = isDatabaseReady();
  
  res.status(dbReady ? 200 : 503).json({
    status: dbReady ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    service: 'vitality-core-backend',
    database: dbReady ? 'connected' : 'disconnected',
  });
});

/**
 * API status/info endpoint
 */
app.get('/api/status', (req, res) => {
  res.json({
    message: 'Vitality Core Backend is running',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    trpcEndpoint: '/trpc',
  });
});

// ============================================================================
// tRPC Integration
// ============================================================================

/**
 * Mount tRPC router at /trpc
 * 
 * All tRPC procedures are accessible at:
 *   POST /trpc/{router}.{procedure} for mutations
 *   GET  /trpc/{router}.{procedure} for queries
 * 
 * Example:
 *   POST /trpc/auth.login
 *   GET  /trpc/diner.list?input={...}
 *   POST /trpc/diner.create
 */
app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
    onError({ error, path }) {
      // Log errors (you could send to error tracking service)
      console.error(`tRPC error on ${path}:`, error.message);
    },
  })
);

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Global error handler
 */
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
  });
});

/**
 * 404 handler for non-tRPC routes
 */
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    hint: 'API endpoints are available at /trpc/*',
  });
});

// ============================================================================
// Server Startup
// ============================================================================

const server = app.listen(PORT, () => {
  console.log('');
  console.log('🚀 Vitality Core Backend');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Port:        http://localhost:${PORT}`);
  console.log(`   Health:      http://localhost:${PORT}/health`);
  console.log(`   tRPC:        http://localhost:${PORT}/trpc`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
});

// ============================================================================
// Graceful Shutdown
// ============================================================================

function shutdown(signal: string) {
  console.log(`\n${signal} received, shutting down gracefully...`);
  
  server.close(() => {
    console.log('HTTP server closed');
    closeDatabase();
    console.log('Database connection closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

