import { Octokit } from '@octokit/rest';
import type { GitHubPR, GitHubFile, ParsedFile } from '../models/github';
import { detectLanguage, shouldAnalyzeFile } from '../utils/language';
import { parsePatch } from '../utils/patch-parser';

export class GitHubService {
  private octokit: Octokit;

  constructor(githubToken: string) {
    this.octokit = new Octokit({
      auth: githubToken,
    });
  }

  /**
   * Parse GitHub repo URL to extract owner and repo name
   */
  private parseRepoUrl(repoUrl: string): { owner: string; repo: string } {
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      throw new Error('Invalid GitHub URL format');
    }

    const [, owner = '', repo = ''] = match;
    return {
      owner,
      repo: repo.replace('.git', ''),
    };
  }

  /**
   * Get PR details
   */
  async getPR(owner: string, repo: string, prNumber: number): Promise<GitHubPR> {
    try {
      const response = await this.octokit.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      });

      return {
        title: response.data.title,
        user: {
          login: response.data.user?.login || 'unknown',
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch PR: ${error.message}`);
    }
  }

  /**
   * Get all files changed in a PR
   */
  async getPRFiles(owner: string, repo: string, prNumber: number): Promise<GitHubFile[]> {
    try {
      const response = await this.octokit.pulls.listFiles({
        owner,
        repo,
        pull_number: prNumber,
        per_page: 100, // Max files to fetch
      });

      return response.data.map(file => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        patch: file.patch,
      }));
    } catch (error: any) {
      throw new Error(`Failed to fetch PR files: ${error.message}`);
    }
  }

  /**
   * Main method: Analyze a PR and return parsed files ready for AI analysis
   */
  async analyzePR(repoUrl: string, prNumber: number): Promise<{
    pr: GitHubPR;
    files: ParsedFile[];
  }> {
    const { owner, repo } = this.parseRepoUrl(repoUrl);

    // Fetch PR details
    const pr = await this.getPR(owner, repo, prNumber);

    // Fetch all files in the PR
    const githubFiles = await this.getPRFiles(owner, repo, prNumber);

    // Parse and filter files
    const parsedFiles: ParsedFile[] = [];

    for (const file of githubFiles) {
      // Skip files we don't want to analyze
      if (!shouldAnalyzeFile(file.filename)) {
        continue;
      }

      // Skip removed files (no code to analyze)
      if (file.status === 'removed') {
        continue;
      }

      // Detect language
      const language = detectLanguage(file.filename);

      // Parse patch if available
      const changes = file.patch ? parsePatch(file.patch) : [];

      parsedFiles.push({
        filename: file.filename,
        language,
        status: file.status as 'added' | 'modified',
        additions: file.additions,
        deletions: file.deletions,
        changes,
      });
    }

    return {
      pr,
      files: parsedFiles,
    };
  }
}
