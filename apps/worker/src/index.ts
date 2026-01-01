import { Worker } from 'bullmq';
import { prisma } from '@repo/database';
import { redis } from './config/redis';
import { env } from './config/env';
import { logger } from './utils/logger';
import { processJob } from './processor';

// Create BullMQ worker for processing PR analysis jobs (2 concurrent jobs, keeps last 100 completed for 1 hour, last 1000 failed for 24 hours)
const worker = new Worker('pr-analysis', processJob, {
  connection: redis,
  concurrency: 2,
  removeOnComplete: { count: 100, age: 3600 },
  removeOnFail: { count: 1000, age: 86400 },
});

// Worker event handlers: log job completion, failures, errors, and stalled jobs
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

// Startup checks: verify database and Redis connections before starting worker
async function startWorker() {
  try {
    logger.info('Checking database connection...');
    await prisma.$connect();
    logger.info('Database connected');

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

// Graceful shutdown: closes worker (waits for active jobs), disconnects database and Redis, then exits
async function shutdown() {
  logger.info('Shutting down worker gracefully...');

  try {
    await worker.close(); // Waits for active jobs to complete
    logger.info('Worker closed');

    await prisma.$disconnect();
    logger.info('Database disconnected');

    await redis.quit();
    logger.info('Redis disconnected');

    process.exit(0);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error during shutdown');
    process.exit(1);
  }
}

// Handle shutdown signals (SIGTERM and SIGINT) for graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the worker
startWorker();

export default worker;
