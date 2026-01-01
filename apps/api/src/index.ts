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

// Middleware
app.use('*', honoLogger());
app.use('*', cors());

// Error handling
app.onError(errorHandler);

// Routes
app.route('/health', healthRoute);
app.route('/api', analysisRoute);

// 404 handler
app.notFound((c) => c.json({ error: 'Not Found' }, 404));

// Startup checks
async function init() {
  try {
    // Check database connection
    logger.info('Checking database connection...');
    await prisma.$connect();
    logger.info('Database connected');

    // Check Redis connection
    logger.info('Checking Redis connection...');
    await redis.ping();
    logger.info('Redis connected');

    logger.info(`API Server ready on http://localhost:${env.PORT}`);

    // Graceful shutdown
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

// Initialize connections
init();

export default app;
