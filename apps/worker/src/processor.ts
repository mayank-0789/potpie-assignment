import type { Job } from 'bullmq';
import { CodeReviewAgent } from '@repo/code-review';
import { resultService } from './services/result.service';
import { logger } from './utils/logger';
import { env } from './config/env';

interface JobData {
  db_job_id: string;
  repo_url: string;
  pr_number: number;
  github_token?: string;
}

// Main job processor: orchestrates entire PR analysis flow - updates status, runs agent, saves results, handles errors
export async function processJob(job: Job<JobData>): Promise<void> {
  const { db_job_id, repo_url, pr_number, github_token } = job.data;

  logger.info(
    { jobId: db_job_id, bullmqJobId: job.id, repo: repo_url, pr: pr_number },
    'Processing PR analysis job'
  );

  try {
    await resultService.updateJobStatus(db_job_id, 'PROCESSING');

    const token = github_token || env.GITHUB_TOKEN;
    if (!token) {
      throw new Error('GitHub token not provided');
    }

    logger.info({ jobId: db_job_id }, 'Initializing autonomous code review agent');
    const agent = new CodeReviewAgent({
      anthropicApiKey: env.OPENROUTER_API_KEY,
      model: env.AI_MODEL,
      githubToken: token,
      logger,
    });

    logger.info({ jobId: db_job_id }, 'Running autonomous agent analysis');
    const agentResult = await agent.analyze(repo_url, pr_number);

    if (agentResult.error) {
      throw new Error(agentResult.error);
    }

    logger.info(
      {
        jobId: db_job_id,
        filesAnalyzed: agentResult.analyzedFiles.length,
        totalIssues: agentResult.analyzedFiles.reduce((sum, r) => sum + r.issues.length, 0),
      },
      'Agent analysis complete'
    );

    // Update PR metadata if available
    if (agentResult.prMetadata) {
      await resultService.updatePRMetadata(
        db_job_id,
        agentResult.prMetadata.title,
        agentResult.prMetadata.author
      );
    }

    await resultService.saveResults(db_job_id, agentResult.analyzedFiles);
    await resultService.updateJobStatus(db_job_id, 'COMPLETED');

    logger.info({ jobId: db_job_id }, 'Job completed successfully');
  } catch (error: any) {
    logger.error(
      { jobId: db_job_id, error: error.message, stack: error.stack },
      'Job failed'
    );

    await resultService.updateJobStatus(db_job_id, 'FAILED', error.message);
    throw error; // Re-throw so BullMQ knows the job failed
  }
}
