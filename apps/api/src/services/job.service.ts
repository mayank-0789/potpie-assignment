import { prisma, JobStatus } from '@repo/database';

export class JobService {
  // Creates new analysis job in database: extracts owner/repo from GitHub URL, sets status to PENDING
  async createJob(data: {
    repoUrl: string;
    prNumber: number;
  }) {
    const match = data.repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      throw new Error('Invalid GitHub URL format');
    }

    const [, owner = '', repo = ''] = match;

    return prisma.analysisJob.create({
      data: {
        repoUrl: data.repoUrl,
        repoOwner: owner,
        repoName: repo.replace('.git', ''),
        prNumber: data.prNumber,
        status: JobStatus.PENDING,
      },
    });
  }

  // Gets job by database ID: includes result summary, files, and all issues
  async getJobById(id: string) {
    return prisma.analysisJob.findUnique({
      where: { id },
      include: {
        result: true,
        files: {
          include: {
            issues: true,
          },
        },
      },
    });
  }

  // Deletes job by ID: used for cleanup when queue operations fail
  async deleteJob(id: string) {
    return prisma.analysisJob.delete({
      where: { id },
    });
  }
}

export const jobService = new JobService();