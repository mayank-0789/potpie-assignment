import type { Context } from 'hono';
import { logger } from '../utils/logger';

export const errorHandler = (err: Error, c: Context) => {
  logger.error({ err }, 'Unhandled error');
  
  return c.json({
    error: 'Internal Server Error',
    message: err.message,
  }, 500);
};
