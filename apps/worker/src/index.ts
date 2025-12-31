import { Worker } from 'bullmq';
import { prisma } from '@repo/database';
import { redis } from './config/redis';
import { env } from './config/env';
import { logger } from './utils/logger';
import { processJob } from './processor';

// Create BullMQ Worker
const worker = new Worker('pr-analysis', processJob, {
  connection: redis,
  concurrency: 2, // Process 2 jobs concurrently
  removeOnComplete: { count: 100, age: 3600 }, // Keep last 100 completed jobs for 1 hour
  removeOnFail: { count: 1000, age: 86400 }, // Keep last 1000 failed jobs for 24 hours
});

// Worker event handlers
worker.on('completed', (job) => {
  logger.info({ jobId: job.id, duration: job.finishedOn ? job.finishedOn - (job.processedOn || 0) : 0 }, 'Job completed');
});

worker.on('failed', (job, err) => {
  logger.error(
    { jobId: job?.id, error: err.message },
    'Job failed'
  );
});

worker.on('error', (err) => {
  logger.error({ error: err.message }, 'Worker error');
});

worker.on('stalled', (jobId) => {
  logger.warn({ jobId }, 'Job stalled');
});

// Startup checks
async function startWorker() {
  try {
    // Check database connection
    logger.info('Checking database connection...');
    await prisma.$connect();
    logger.info('Database connected');

    // Check Redis connection
    logger.info('Checking Redis connection...');
    await redis.ping();
    logger.info('Redis connected');

    logger.info(
      {
        concurrency: 2,
        queue: 'pr-analysis',
        model: 'claude-3-5-sonnet-20241022',
      },
      'Worker started successfully'
    );
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to start worker');
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down worker gracefully...');

  try {
    // Close worker (waits for active jobs to complete)
    await worker.close();
    logger.info('Worker closed');

    // Disconnect from database
    await prisma.$disconnect();
    logger.info('Database disconnected');

    // Close Redis connection
    await redis.quit();
    logger.info('Redis disconnected');

    process.exit(0);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error during shutdown');
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the worker
startWorker();

export default worker;
