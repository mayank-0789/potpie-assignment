import { StateGraph } from "@langchain/langgraph";
import { AgentState, type AgentStateType } from "./agent-state";
import { createFetchPRTool, createAnalyzeFileTool } from "./tools";
import type { CodeIssue, ParsedFile } from "../models";

// Configuration for the Code Review Agent
export interface CodeReviewAgentConfig {
  anthropicApiKey: string;
  model?: string;
  githubToken: string;
  logger?: any;
}

// Autonomous Code Review Agent using LangGraph - fetches PR data, analyzes files with AI, and returns structured results
export class CodeReviewAgent {
  private graph: any;
  private config: CodeReviewAgentConfig;
  private logger: any;

  constructor(config: CodeReviewAgentConfig) {
    this.config = config;
    this.logger = config.logger || console;
    this.graph = this.buildGraph();
  }

  // Builds the agent's state graph with nodes (steps) and edges (transitions) for the workflow
  private buildGraph() {
    const workflow = new StateGraph(AgentState);

    // Add workflow nodes: fetch PR, analyze file, decide next action, finish
    workflow.addNode("fetch_pr", this.fetchPRNode.bind(this) as any);
    workflow.addNode("analyze_file", this.analyzeFileNode.bind(this) as any);
    workflow.addNode("decide_next", this.decideNextNode.bind(this) as any);
    workflow.addNode("finish", this.finishNode.bind(this) as any);

    // Define workflow edges: start → fetch_pr → decide_next → (analyze_file or finish) → end
    workflow.addEdge("__start__", "fetch_pr" as any);
    workflow.addEdge("fetch_pr" as any, "decide_next" as any);
    workflow.addEdge("analyze_file" as any, "decide_next" as any);
    workflow.addConditionalEdges("decide_next" as any, (state: any) => state.nextAction);
    workflow.addEdge("finish" as any, "__end__" as any);

    return workflow.compile();
  }

  // Fetches PR metadata and changed files from GitHub using the GitHub tool (always the first step)
  private async fetchPRNode(
    state: AgentStateType
  ): Promise<Partial<AgentStateType>> {
    this.logger.info?.(
      `Agent: Fetching PR data from GitHub (${state.repoUrl} #${state.prNumber})`
    );

    try {
      const tool = createFetchPRTool(state.githubToken);
      const result = await tool.func({
        repoUrl: state.repoUrl,
        prNumber: state.prNumber,
      });

      const prData = JSON.parse(result);

      this.logger.info?.(
        `Agent: Found ${prData.filesCount} files to analyze in PR "${prData.title}"`
      );

      return {
        prMetadata: {
          title: prData.title,
          author: prData.author,
        },
        filesToAnalyze: prData.files,
        currentFileIndex: 0,
      };
    } catch (error: any) {
      this.logger.error?.(`Agent: Failed to fetch PR data: ${error.message}`);
      return {
        error: `Failed to fetch PR: ${error.message}`,
        nextAction: "finish",
      };
    }
  }

  // Analyzes the current file using CodeAnalyzer tool, stores results, and moves to next file
  private async analyzeFileNode(
    state: AgentStateType
  ): Promise<Partial<AgentStateType>> {
    const file = state.filesToAnalyze[state.currentFileIndex];

    if (!file) {
      this.logger.error?.(`Agent: File at index ${state.currentFileIndex} is undefined`);
      return {
        error: `File at index ${state.currentFileIndex} is undefined`,
        nextAction: "finish",
      };
    }

    this.logger.info?.(
      `Agent: Analyzing file ${state.currentFileIndex + 1}/${state.filesToAnalyze.length}: ${file.filename}`
    );

    try {
      const tool = createAnalyzeFileTool(this.config.anthropicApiKey, this.config.model, this.logger);
      const result = await tool.func({ file });

      const parsed = JSON.parse(result);
      const issues: CodeIssue[] = parsed.issues;

      this.logger.info?.(
        `Agent: Found ${issues.length} issue(s) in ${file.filename}`
      );

      return {
        analyzedFiles: [...state.analyzedFiles, { file, issues }],
        currentFileIndex: state.currentFileIndex + 1,
      };
    } catch (error: any) {
      this.logger.error?.(
        `Agent: Error analyzing ${file.filename}: ${error.message}. Continuing with empty results.`
      );

      // Continue with empty results if analysis fails
      return {
        analyzedFiles: [...state.analyzedFiles, { file, issues: [] }],
        currentFileIndex: state.currentFileIndex + 1,
      };
    }
  }

  // Makes autonomous decision: if more files exist → analyze_file, else → finish
  private async decideNextNode(
    state: AgentStateType
  ): Promise<Partial<AgentStateType>> {
    if (state.currentFileIndex < state.filesToAnalyze.length) {
      this.logger.info?.(
        `Agent: Decision - Analyze next file (${state.currentFileIndex + 1}/${state.filesToAnalyze.length})`
      );
      return { nextAction: "analyze_file" };
    } else {
      const totalIssues = state.analyzedFiles.reduce(
        (sum, r) => sum + r.issues.length,
        0
      );
      this.logger.info?.(
        `Agent: Decision - All ${state.filesToAnalyze.length} files analyzed (${totalIssues} total issues). Finishing up.`
      );
      return { nextAction: "finish" };
    }
  }

  // Final step: agent has completed analysis, logs results and returns
  private async finishNode(
    state: AgentStateType
  ): Promise<Partial<AgentStateType>> {
    if (state.error) {
      this.logger.error?.(`Agent: Task failed - ${state.error}`);
    } else {
      const totalIssues = state.analyzedFiles.reduce(
        (sum, r) => sum + r.issues.length,
        0
      );
      this.logger.info?.(
        `Agent: Task completed successfully - Analyzed ${state.analyzedFiles.length} files, found ${totalIssues} issues`
      );
    }
    return {};
  }

  // Main entry point: initializes state and runs the agent graph until completion, returns final state with all results
  async analyze(repoUrl: string, prNumber: number): Promise<AgentStateType> {
    this.logger.info?.(
      `Starting autonomous code review agent for ${repoUrl} PR #${prNumber}`
    );

    const initialState: AgentStateType = {
      repoUrl,
      prNumber,
      githubToken: this.config.githubToken,
      prMetadata: null,
      filesToAnalyze: [],
      currentFileIndex: 0,
      analyzedFiles: [],
      nextAction: "fetch_pr",
      error: null,
    };

    try {
      const result = await this.graph.invoke(initialState);

      this.logger.info?.(
        `Agent execution complete`
      );

      return result;
    } catch (error: any) {
      this.logger.error?.(
        `Agent execution failed: ${error.message}`
      );
      throw error;
    }
  }
}
