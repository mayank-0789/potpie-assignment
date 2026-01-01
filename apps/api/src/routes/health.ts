import { Hono } from 'hono';
import { redis } from '../config/redis';
import { prisma } from '@repo/database';
import { logger } from '../utils/logger';

export const healthRoute = new Hono();

// GET /health: health check endpoint - verifies Redis and database connectivity
healthRoute.get('/', async (c) => {
  try {
    await redis.ping();
    await prisma.$queryRaw`SELECT 1`;

    return c.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        redis: 'connected',
        database: 'connected',
      },
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Health check failed');
    return c.json({
      status: 'unhealthy',
      error: error.message,
    }, 503);
  }
});
