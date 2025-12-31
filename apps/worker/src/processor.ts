import type { Job } from 'bullmq';
import { GitHubService, type ParsedFile, type CodeIssue } from '@repo/code-review';
import { analyzeFile } from './ai/analyzer';
import { resultService } from './services/result.service';
import { logger } from './utils/logger';
import { env } from './config/env';

interface JobData {
  db_job_id: string;
  repo_url: string;
  pr_number: number;
  github_token?: string;
}

/**
 * Main job processor
 * Orchestrates the entire PR analysis flow
 */
export async function processJob(job: Job<JobData>): Promise<void> {
  const { db_job_id, repo_url, pr_number, github_token } = job.data;

  logger.info(
    { jobId: db_job_id, bullmqJobId: job.id, repo: repo_url, pr: pr_number },
    'Processing PR analysis job'
  );

  try {
    // Step 1: Update job status to PROCESSING
    await resultService.updateJobStatus(db_job_id, 'PROCESSING');

    // Step 2: Fetch PR data from GitHub
    const token = github_token || env.GITHUB_TOKEN;
    if (!token) {
      throw new Error('GitHub token not provided');
    }

    logger.info({ jobId: db_job_id }, 'Fetching PR data from GitHub');
    const githubService = new GitHubService(token);
    const { pr, files } = await githubService.analyzePR(repo_url, pr_number);

    logger.info(
      { jobId: db_job_id, filesCount: files.length, prTitle: pr.title },
      'PR data fetched successfully'
    );

    // Step 3: Update PR metadata in database
    await resultService.updatePRMetadata(db_job_id, pr.title, pr.user.login);

    // Step 4: Analyze each file with AI
    logger.info({ jobId: db_job_id, filesCount: files.length }, 'Starting AI analysis');

    const results: Array<{ file: ParsedFile; issues: CodeIssue[] }> = [];

    for (const file of files) {
      logger.debug(
        { jobId: db_job_id, filename: file.filename, language: file.language },
        'Analyzing file'
      );

      const issues = await analyzeFile(file);

      results.push({ file, issues });

      logger.debug(
        { jobId: db_job_id, filename: file.filename, issuesFound: issues.length },
        'File analyzed'
      );
    }

    const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
    logger.info(
      { jobId: db_job_id, filesAnalyzed: files.length, totalIssues },
      'AI analysis complete'
    );

    // Step 5: Save all results to database
    await resultService.saveResults(db_job_id, results);

    // Step 6: Update job status to COMPLETED
    await resultService.updateJobStatus(db_job_id, 'COMPLETED');

    logger.info({ jobId: db_job_id }, 'Job completed successfully');
  } catch (error: any) {
    logger.error(
      { jobId: db_job_id, error: error.message, stack: error.stack },
      'Job failed'
    );

    // Update job status to FAILED with error message
    await resultService.updateJobStatus(db_job_id, 'FAILED', error.message);

    // Re-throw error so BullMQ knows the job failed
    throw error;
  }
}
