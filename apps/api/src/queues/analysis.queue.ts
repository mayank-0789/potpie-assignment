import { Queue } from 'bullmq';
import { redis } from '../config/redis';

// BullMQ queue for PR analysis jobs: 3 retry attempts with exponential backoff, keeps completed jobs 1 hour, failed jobs 24 hours
export const analysisQueue = new Queue('pr-analysis', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600,
      count: 100,
    },
    removeOnFail: {
      age: 86400,
    },
  },
});
