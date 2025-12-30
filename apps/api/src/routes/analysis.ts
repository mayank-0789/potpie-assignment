import { Hono } from 'hono';
import { z } from 'zod';
import { analysisQueue } from '../queues/analysis.queue';
import { jobService } from '../services/job.service';
import { logger } from '../utils/logger';

export const analysisRoute = new Hono();

// Request validation schema
const analyzePRSchema = z.object({
  repo_url: z.string().url().regex(/github\.com/, 'Must be a GitHub URL'),
  pr_number: z.number().int().positive(),
  github_token: z.string().optional(),
});

// Analyze PR -> /api/analyze-pr (POST)
analysisRoute.post('/analyze-pr', async (c) => {
  try {
    const body = await c.req.json();
    const validated = analyzePRSchema.parse(body);

    logger.info({ repo: validated.repo_url, pr: validated.pr_number }, 'Creating analysis job');

    // Add job to queue
    const bullmqJob = await analysisQueue.add('analyze-pr', {
      repo_url: validated.repo_url,
      pr_number: validated.pr_number,
      github_token: validated.github_token,
    });

    // Create db record
    const dbJob = await jobService.createJob({
      repoUrl: validated.repo_url,
      prNumber: validated.pr_number,
      bullmqJobId: bullmqJob.id!,
    });

    logger.info({ jobId: dbJob.id, bullmqJobId: bullmqJob.id }, 'Job created successfully');

    return c.json({
      task_id: dbJob.id,
      status: 'pending',
    }, 202);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      logger.warn({ errors: error.errors }, 'Validation error');
      return c.json({
        error: 'Validation error',
        details: error.errors,
      }, 400);
    }
    
    logger.error({ error: error.message }, 'Failed to create analysis job');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get job status -> /api/status/:task_id
analysisRoute.get('/status/:task_id', async (c) => {
  const taskId = c.req.param('task_id');
  
  try {
    const job = await jobService.getJobById(taskId);

    if (!job) {
      return c.json({ error: 'Task not found' }, 404);
    }

    return c.json({
      task_id: taskId,
      status: job.status.toLowerCase(),
      error: job.error || undefined,
    });
  } catch (error: any) {
    logger.error({ error: error.message, taskId }, 'Failed to get job status');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get job results -> /api/results/:task_id (GET)
analysisRoute.get('/results/:task_id', async (c) => {
  const taskId = c.req.param('task_id');
  
  try {
    const job = await jobService.getJobById(taskId);

    if (!job) {
      return c.json({ error: 'Task not found' }, 404);
    }

    if (job.status === 'FAILED') {
      return c.json({
        task_id: taskId,
        status: 'failed',
        error: job.error || 'Analysis failed',
      }, 400);
    }

    if (job.status !== 'COMPLETED') {
      return c.json({
        task_id: taskId,
        status: job.status.toLowerCase(),
        message: 'Analysis not yet completed',
      }, 400);
    }

    // Format response
    const response = {
      task_id: taskId,
      status: 'completed',
      results: {
        files: job.files.map(file => ({
          name: file.filename,
          language: file.language,
          issues: file.issues.map(issue => ({
            type: issue.type.toLowerCase(),
            severity: issue.severity.toLowerCase(),
            line: issue.line,
            description: issue.description,
            suggestion: issue.suggestion,
          })),
        })),
        summary: job.result ? {
          total_files: job.result.totalFiles,
          total_issues: job.result.totalIssues,
          critical_issues: job.result.criticalIssues,
          high_issues: job.result.highIssues,
          medium_issues: job.result.mediumIssues,
          low_issues: job.result.lowIssues,
        } : null,
      },
    };

    return c.json(response);
  } catch (error: any) {
    logger.error({ error: error.message, taskId }, 'Failed to get job results');
    return c.json({ error: 'Internal server error' }, 500);
  }
});
