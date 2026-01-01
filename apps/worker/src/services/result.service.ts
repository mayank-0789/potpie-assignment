import { prisma, JobStatus, FileStatus, IssueType, IssueSeverity } from '@repo/database';
import type { ParsedFile, CodeIssue } from '@repo/code-review';
import { logger } from '../utils/logger';

export class ResultService {
  // Updates job status in database: sets startedAt for PROCESSING, completedAt and duration for COMPLETED/FAILED, stores error if provided
  async updateJobStatus(
    jobId: string,
    status: JobStatus,
    error?: string
  ): Promise<void> {
    const updateData: any = { status };

    if (status === 'PROCESSING') {
      updateData.startedAt = new Date();
    } else if (status === 'COMPLETED' || status === 'FAILED') {
      updateData.completedAt = new Date();

      // Calculate duration from start time
      const job = await prisma.analysisJob.findUnique({
        where: { id: jobId },
        select: { startedAt: true },
      });

      if (job?.startedAt) {
        updateData.durationMs = Date.now() - job.startedAt.getTime();
      }
    }

    if (error) {
      updateData.error = error;
    }

    await prisma.analysisJob.update({
      where: { id: jobId },
      data: updateData,
    });

    logger.info({ jobId, status }, 'Job status updated');
  }

  // Updates PR metadata (title and author) in the job record
  async updatePRMetadata(
    jobId: string,
    title: string,
    author: string
  ): Promise<void> {
    await prisma.analysisJob.update({
      where: { id: jobId },
      data: {
        prTitle: title,
        prAuthor: author,
      },
    });

    logger.debug({ jobId, title, author }, 'PR metadata updated');
  }

  // Saves complete analysis results: saves each file with its issues, then creates summary with issue counts by severity
  async saveResults(
    jobId: string,
    results: Array<{ file: ParsedFile; issues: CodeIssue[] }>
  ): Promise<void> {
    logger.info({ jobId, filesCount: results.length }, 'Saving analysis results');

    for (const { file, issues } of results) {
      await this.saveFileAnalysis(jobId, file, issues);
    }

    await this.createSummary(jobId, results);

    logger.info({ jobId }, 'Analysis results saved successfully');
  }

  // Saves file analysis record and its issues: maps file status to enum, creates file record, then saves all issues
  private async saveFileAnalysis(
    jobId: string,
    file: ParsedFile,
    issues: CodeIssue[]
  ): Promise<void> {
    const fileStatus: FileStatus =
      file.status === 'added' ? 'ADDED' : file.status === 'modified' ? 'MODIFIED' : 'REMOVED';

    const fileRecord = await prisma.fileAnalysis.create({
      data: {
        jobId,
        filename: file.filename,
        language: file.language,
        status: fileStatus,
        additions: file.additions,
        deletions: file.deletions,
      },
    });

    logger.debug(
      { jobId, fileId: fileRecord.id, filename: file.filename, issuesCount: issues.length },
      'File analysis saved'
    );

    if (issues.length > 0) {
      await this.saveIssues(jobId, fileRecord.id, issues);
    }
  }

  // Bulk inserts issues for a file: maps CodeIssue to database Issue format
  private async saveIssues(
    jobId: string,
    fileId: string,
    issues: CodeIssue[]
  ): Promise<void> {
    await prisma.issue.createMany({
      data: issues.map(issue => ({
        jobId,
        fileId,
        type: issue.type as IssueType,
        severity: issue.severity as IssueSeverity,
        line: issue.line,
        description: issue.description,
        suggestion: issue.suggestion
      })),
    });

    logger.debug(
      { jobId, fileId, issuesCount: issues.length },
      'Issues saved'
    );
  }

  // Creates analysis summary: counts total files, total issues, and issues by severity level (critical, high, medium, low)
  private async createSummary(
    jobId: string,
    results: Array<{ file: ParsedFile; issues: CodeIssue[] }>
  ): Promise<void> {
    const totalFiles = results.length;
    const allIssues = results.flatMap(r => r.issues);
    const totalIssues = allIssues.length;

    const criticalIssues = allIssues.filter(i => i.severity === 'CRITICAL').length;
    const highIssues = allIssues.filter(i => i.severity === 'HIGH').length;
    const mediumIssues = allIssues.filter(i => i.severity === 'MEDIUM').length;
    const lowIssues = allIssues.filter(i => i.severity === 'LOW').length;

    await prisma.analysisResult.create({
      data: {
        jobId,
        totalFiles,
        totalIssues,
        criticalIssues,
        highIssues,
        mediumIssues,
        lowIssues,
      },
    });

    logger.info(
      {
        jobId,
        totalFiles,
        totalIssues,
        critical: criticalIssues,
        high: highIssues,
        medium: mediumIssues,
        low: lowIssues,
      },
      'Analysis summary created'
    );
  }
}

export const resultService = new ResultService();
