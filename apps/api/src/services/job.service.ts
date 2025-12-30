import { prisma, JobStatus } from '@repo/database';

export class JobService {
  
// Create a new analysis job in db
  async createJob(data: {
    repoUrl: string;
    prNumber: number;
    bullmqJobId: string;
  }) {
    // Extract owner and repo from URL
    const match = data.repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      throw new Error('Invalid GitHub URL format');
    }

    const [, owner, repo] = match;

    return prisma.analysisJob.create({
      data: {
        repoUrl: data.repoUrl,
        repoOwner: owner!,
        repoName: repo?.replace('.git', '') ?? '',
        prNumber: data.prNumber,
        bullmqJobId: data.bullmqJobId,
        status: JobStatus.PENDING,
      },
    });
  }

// Get job by bullmq job id
  async getJobByBullMQId(bullmqJobId: string) {
    return prisma.analysisJob.findUnique({
      where: { bullmqJobId },
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
}

export const jobService = new JobService();