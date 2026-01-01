import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { GitHubService } from "../services/github.service";
import { CodeAnalyzer } from "./analyzer";
import type { ParsedFile } from "../models";

/**
 * Tool 1: Fetch PR Data from GitHub
 *
 * This tool wraps the existing GitHubService to fetch PR metadata and files.
 * It reuses all the existing logic for GitHub API calls, diff parsing, and language detection.
 */
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
      // REUSE existing GitHubService
      const githubService = new GitHubService(githubToken);
      const { pr, files } = await githubService.analyzePR(repoUrl, prNumber);

      // Return structured data for the agent
      return JSON.stringify({
        title: pr.title,
        author: pr.user.login,
        filesCount: files.length,
        files: files,
      });
    },
  });
}

/**
 * Tool 2: Analyze Code File with AI
 *
 * This tool wraps the existing CodeAnalyzer to analyze a single file.
 * It reuses all the existing logic for prompt building, Claude API calls,
 * response parsing, and issue validation.
 */
export function createAnalyzeFileTool(anthropicApiKey: string, logger?: any) {
  // REUSE existing CodeAnalyzer
  const codeAnalyzer = new CodeAnalyzer({
    apiKey: anthropicApiKey,
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
      // REUSE existing CodeAnalyzer.analyzeFile() method
      // This internally uses buildAnalysisPrompt(), calls Claude API,
      // and validates the response
      const issues = await codeAnalyzer.analyzeFile(file as ParsedFile);

      // Return issues as JSON string
      return JSON.stringify({ issues });
    },
  });
}

/**
 * Tool 3: Summarize Analysis Results
 *
 * This tool creates a summary of all analyzed files and issues.
 * It aggregates issue counts by severity level.
 */
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

      // Count by severity
      const criticalIssues = allIssues.filter(
        (i: any) => i.severity === "CRITICAL"
      ).length;
      const highIssues = allIssues.filter((i: any) => i.severity === "HIGH").length;
      const mediumIssues = allIssues.filter(
        (i: any) => i.severity === "MEDIUM"
      ).length;
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
