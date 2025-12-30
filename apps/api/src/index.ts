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

// Startup checks and server initialization
async function startServer() {
  try {
    // Check database connection
    logger.info('Checking database connection...');
    await prisma.$connect();
    logger.info('Database connected');

    // Check Redis connection
    logger.info('Checking Redis connection...');
    await redis.ping();
    logger.info('Redis connected');

    // Start server
    const server = Bun.serve({
      port: env.PORT,
      fetch: app.fetch,
    });

    logger.info(`API Server running on http://localhost:${env.PORT}`);

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.stop();
      await prisma.$disconnect();
      await redis.quit();
      process.exit(0);
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to start server');
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;
