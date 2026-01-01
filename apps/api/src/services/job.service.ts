import { prisma, JobStatus } from '@repo/database';

export class JobService {
  
// Create a new analysis job in db
  async createJob(data: {
    repoUrl: string;
    prNumber: number;
  }) {
    // Extract owner and repo from URL
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

  // Get job by db id
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

  // Delete job (for cleanup on errors)
  async deleteJob(id: string) {
    return prisma.analysisJob.delete({
      where: { id },
    });
  }
}

export const jobService = new JobService();