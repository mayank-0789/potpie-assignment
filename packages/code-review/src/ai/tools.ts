import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { GitHubService } from "../services/github.service";
import { CodeAnalyzer } from "./analyzer";
import type { ParsedFile } from "../models";

// Tool 1: Wraps GitHubService to fetch PR metadata and files - reuses existing GitHub API, diff parsing, and language detection logic
export function createFetchPRTool(githubToken: string) {
  return new DynamicStructuredTool({
    name: "fetch_pr_data",
    description:
      "Fetches pull request data from GitHub including PR metadata, changed files, and their diffs. " +
      "This tool returns the PR title, author, and list of files with their changes.",
    schema: z.object({
      repoUrl: z.string().describe("GitHub repository URL (e.g., 'facebook/react')"),
      prNumber: z.number().describe("Pull request number"),
    }),
    func: async ({ repoUrl, prNumber }) => {
      const githubService = new GitHubService(githubToken);
      const { pr, files } = await githubService.analyzePR(repoUrl, prNumber);

      return JSON.stringify({
        title: pr.title,
        author: pr.user.login,
        filesCount: files.length,
        files: files,
      });
    },
  });
}

// Tool 2: Wraps CodeAnalyzer to analyze a single file - reuses prompt building, AI API calls, response parsing, and validation logic
export function createAnalyzeFileTool(anthropicApiKey: string, model?: string, logger?: any) {
  const codeAnalyzer = new CodeAnalyzer({
    apiKey: anthropicApiKey,
    model,
    logger,
  });

  return new DynamicStructuredTool({
    name: "analyze_code_file",
    description:
      "Analyzes a single code file for potential issues including bugs, security vulnerabilities, " +
      "performance problems, style issues, and best practice violations. " +
      "Returns a structured list of issues with severity levels and suggestions.",
    schema: z.object({
      file: z
        .object({
          filename: z.string(),
          language: z.string(),
          status: z.enum(["added", "modified", "removed"]),
          changes: z.array(z.any()),
          additions: z.number(),
          deletions: z.number(),
        })
        .describe("The file object to analyze"),
    }),
    func: async ({ file }) => {
      const issues = await codeAnalyzer.analyzeFile(file as ParsedFile);
      return JSON.stringify({ issues });
    },
  });
}

// Tool 3: Creates summary of analyzed files and issues - aggregates issue counts by severity level (critical, high, medium, low)
export function createSummarizeTool() {
  return new DynamicStructuredTool({
    name: "summarize_results",
    description:
      "Creates a summary of all analyzed files and issues, including total counts " +
      "and breakdowns by severity level (critical, high, medium, low).",
    schema: z.object({
      analyzedFiles: z
        .array(
          z.object({
            file: z.any(),
            issues: z.array(z.any()),
          })
        )
        .describe("Array of analyzed files with their issues"),
    }),
    func: async ({ analyzedFiles }) => {
      const totalFiles = analyzedFiles.length;
      const allIssues = analyzedFiles.flatMap((f: any) => f.issues);
      const totalIssues = allIssues.length;

      // Count issues by severity level
      const criticalIssues = allIssues.filter((i: any) => i.severity === "CRITICAL").length;
      const highIssues = allIssues.filter((i: any) => i.severity === "HIGH").length;
      const mediumIssues = allIssues.filter((i: any) => i.severity === "MEDIUM").length;
      const lowIssues = allIssues.filter((i: any) => i.severity === "LOW").length;

      return JSON.stringify({
        totalFiles,
        totalIssues,
        criticalIssues,
        highIssues,
        mediumIssues,
        lowIssues,
      });
    },
  });
}
