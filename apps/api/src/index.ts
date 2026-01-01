import { Hono } from 'hono';
import { logger as honoLogger } from 'hono/logger';
import { cors } from 'hono/cors';
import { healthRoute } from './routes/health';
import { analysisRoute } from './routes/analysis';
import { errorHandler } from './middleware/error-handler';
import { env } from './config/env';
import { logger } from './utils/logger';
import { prisma } from '@repo/database';
import { redis } from './config/redis';

const app = new Hono();

// Middleware: request logging and CORS
app.use('*', honoLogger());
app.use('*', cors());

// Error handling: global error handler for all routes
app.onError(errorHandler);

// Routes: health check and PR analysis endpoints
app.route('/health', healthRoute);
app.route('/api', analysisRoute);

// 404 handler: returns JSON error for unmatched routes
app.notFound((c) => c.json({ error: 'Not Found' }, 404));

// Startup checks: verifies database and Redis connections before starting server
async function init() {
  try {
    logger.info('Checking database connection...');
    await prisma.$connect();
    logger.info('Database connected');

    logger.info('Checking Redis connection...');
    await redis.ping();
    logger.info('Redis connected');

    logger.info(`API Server ready on http://localhost:${env.PORT}`);

    // Graceful shutdown: disconnects database and Redis, then exits
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully`);
      await prisma.$disconnect();
      await redis.quit();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to initialize server');
    process.exit(1);
  }
}

// Initialize connections and start server
init();

export default app;
