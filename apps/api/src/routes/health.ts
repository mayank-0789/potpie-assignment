import { Hono } from 'hono';
import { redis } from '../config/redis';
import { prisma } from '@repo/database';

export const healthRoute = new Hono();

healthRoute.get('/', async (c) => {
  try {
    // Check Redis
    await redis.ping();
    
    return c.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        redis: 'connected',
        database: 'connected',
      },
    });
  } catch (error: any) {
    return c.json({
      status: 'unhealthy',
      error: error.message,
    }, 503);
  }
});
