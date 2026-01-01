import { StateGraph } from "@langchain/langgraph";
import { AgentState, type AgentStateType } from "./agent-state";
import { createFetchPRTool, createAnalyzeFileTool } from "./tools";
import type { CodeIssue, ParsedFile } from "../models";

/**
 * Configuration for the Code Review Agent
 */
export interface CodeReviewAgentConfig {
  anthropicApiKey: string;
  model?: string;
  githubToken: string;
  logger?: any;
}

/**
 * Autonomous Code Review Agent
 *
 * This agent uses LangGraph to autonomously review GitHub pull requests.
 * It makes decisions at each step about what to do next, uses tools to gather
 * information and analyze code, and returns structured results.
 *
 * Agent Flow:
 * 1. Fetch PR data from GitHub
 * 2. Decide: more files to analyze?
 * 3. Analyze next file with Claude AI
 * 4. Repeat step 2-3 until all files analyzed
 * 5. Finish and return results
 */
export class CodeReviewAgent {
  private graph: any;
  private config: CodeReviewAgentConfig;
  private logger: any;

  constructor(config: CodeReviewAgentConfig) {
    this.config = config;
    this.logger = config.logger || console;
    this.graph = this.buildGraph();
  }

  /**
   * Build the agent's state graph
   *
   * This defines the nodes (steps) and edges (transitions) of the agent's workflow.
   */
  private buildGraph() {
    const workflow = new StateGraph(AgentState);

    // Add nodes (agent steps)
    workflow.addNode("fetch_pr", this.fetchPRNode.bind(this) as any);
    workflow.addNode("analyze_file", this.analyzeFileNode.bind(this) as any);
    workflow.addNode("decide_next", this.decideNextNode.bind(this) as any);
    workflow.addNode("finish", this.finishNode.bind(this) as any);

    // Define the flow - start at fetch_pr
    workflow.addEdge("__start__", "fetch_pr" as any);

    // After fetching PR, decide what to do
    workflow.addEdge("fetch_pr" as any, "decide_next" as any);

    // After analyzing a file, decide what to do
    workflow.addEdge("analyze_file" as any, "decide_next" as any);

    // Conditional edges based on agent's decision
    workflow.addConditionalEdges("decide_next" as any, (state: any) => {
      return state.nextAction;
    });

    // Finish is the end
    workflow.addEdge("finish" as any, "__end__" as any);

    return workflow.compile();
  }

  /**
   * Node 1: Fetch PR Data from GitHub
   *
   * The agent uses the GitHub tool to fetch PR metadata and files.
   * This is always the first step.
   */
  private async fetchPRNode(
    state: AgentStateType
  ): Promise<Partial<AgentStateType>> {
    this.logger.info?.(
      `🤖 Agent: Fetching PR data from GitHub (${state.repoUrl} #${state.prNumber})`
    );

    try {
      // Create and use the GitHub tool
      const tool = createFetchPRTool(state.githubToken);
      const result = await tool.func({
        repoUrl: state.repoUrl,
        prNumber: state.prNumber,
      });

      const prData = JSON.parse(result);

      this.logger.info?.(
        `✅ Agent: Found ${prData.filesCount} files to analyze in PR "${prData.title}"`
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
      this.logger.error?.(`❌ Agent: Failed to fetch PR data: ${error.message}`);
      return {
        error: `Failed to fetch PR: ${error.message}`,
        nextAction: "finish",
      };
    }
  }

  /**
   * Node 2: Analyze a Single File
   *
   * The agent uses the CodeAnalyzer tool to analyze the current file.
   * It stores the results and moves to the next file.
   */
  private async analyzeFileNode(
    state: AgentStateType
  ): Promise<Partial<AgentStateType>> {
    const file = state.filesToAnalyze[state.currentFileIndex];

    // Safety check
    if (!file) {
      this.logger.error?.(`❌ Agent: File at index ${state.currentFileIndex} is undefined`);
      return {
        error: `File at index ${state.currentFileIndex} is undefined`,
        nextAction: "finish",
      };
    }

    this.logger.info?.(
      `🤖 Agent: Analyzing file ${state.currentFileIndex + 1}/${state.filesToAnalyze.length}: ${file.filename}`
    );

    try {
      // Create and use the analyze tool
      const tool = createAnalyzeFileTool(this.config.anthropicApiKey, this.config.model, this.logger);
      const result = await tool.func({ file });

      const parsed = JSON.parse(result);
      const issues: CodeIssue[] = parsed.issues;

      this.logger.info?.(
        `✅ Agent: Found ${issues.length} issue(s) in ${file.filename}`
      );

      // Add this file's results to the accumulated results
      return {
        analyzedFiles: [...state.analyzedFiles, { file, issues }],
        currentFileIndex: state.currentFileIndex + 1,
      };
    } catch (error: any) {
      this.logger.error?.(
        `⚠️  Agent: Error analyzing ${file.filename}: ${error.message}. Continuing with empty results.`
      );

      // On error, store empty results for this file and continue
      return {
        analyzedFiles: [...state.analyzedFiles, { file, issues: [] }],
        currentFileIndex: state.currentFileIndex + 1,
      };
    }
  }

  /**
   * Node 3: Decide What to Do Next
   *
   * The agent makes an autonomous decision based on the current state:
   * - If there are more files to analyze → go to analyze_file
   * - If all files are done → go to finish
   */
  private async decideNextNode(
    state: AgentStateType
  ): Promise<Partial<AgentStateType>> {
    // Check if there are more files to analyze
    if (state.currentFileIndex < state.filesToAnalyze.length) {
      this.logger.info?.(
        `🤖 Agent: Decision - Analyze next file (${state.currentFileIndex + 1}/${state.filesToAnalyze.length})`
      );
      return { nextAction: "analyze_file" };
    } else {
      const totalIssues = state.analyzedFiles.reduce(
        (sum, r) => sum + r.issues.length,
        0
      );
      this.logger.info?.(
        `🤖 Agent: Decision - All ${state.filesToAnalyze.length} files analyzed (${totalIssues} total issues). Finishing up.`
      );
      return { nextAction: "finish" };
    }
  }

  /**
   * Node 4: Finish
   *
   * The agent has completed its work. This is the final step.
   */
  private async finishNode(
    state: AgentStateType
  ): Promise<Partial<AgentStateType>> {
    if (state.error) {
      this.logger.error?.(`❌ Agent: Task failed - ${state.error}`);
    } else {
      const totalIssues = state.analyzedFiles.reduce(
        (sum, r) => sum + r.issues.length,
        0
      );
      this.logger.info?.(
        `✅ Agent: Task completed successfully - Analyzed ${state.analyzedFiles.length} files, found ${totalIssues} issues`
      );
    }
    return {};
  }

  /**
   * Public method to run the agent
   *
   * This is the main entry point for using the agent.
   * It initializes the state and runs the graph until completion.
   *
   * @param repoUrl - GitHub repository URL (e.g., "facebook/react")
   * @param prNumber - Pull request number
   * @returns The final agent state with all results
   */
  async analyze(repoUrl: string, prNumber: number): Promise<AgentStateType> {
    this.logger.info?.(
      `\n🚀 Starting autonomous code review agent for ${repoUrl} PR #${prNumber}\n`
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
        `\n🎉 Agent execution complete!\n`
      );

      return result;
    } catch (error: any) {
      this.logger.error?.(
        `\n💥 Agent execution failed: ${error.message}\n`
      );
      throw error;
    }
  }
}
