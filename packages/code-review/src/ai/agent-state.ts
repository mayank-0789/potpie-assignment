import { Annotation } from "@langchain/langgraph";
import type { ParsedFile, CodeIssue } from "../models";

/**
 * Agent State Definition
 *
 * This defines the state that flows through the agent as it processes
 * a code review task. The agent will read and update this state at each step.
 */
export const AgentState = Annotation.Root({
  // ===== INPUT =====
  // Initial data provided by the user
  repoUrl: Annotation<string>({
    reducer: (prev, next) => next ?? prev,
  }),
  prNumber: Annotation<number>({
    reducer: (prev, next) => next ?? prev,
  }),
  githubToken: Annotation<string>({
    reducer: (prev, next) => next ?? prev,
  }),

  // ===== INTERMEDIATE STATE =====
  // Data gathered during processing
  prMetadata: Annotation<{ title: string; author: string } | null>({
    default: () => null,
    reducer: (prev, next) => next ?? prev,
  }),

  filesToAnalyze: Annotation<ParsedFile[]>({
    default: () => [],
    reducer: (prev, next) => next ?? prev,
  }),

  currentFileIndex: Annotation<number>({
    default: () => 0,
    reducer: (prev, next) => next ?? prev,
  }),

  // ===== RESULTS =====
  // Accumulated analysis results
  analyzedFiles: Annotation<Array<{ file: ParsedFile; issues: CodeIssue[] }>>({
    default: () => [],
    reducer: (prev, next) => {
      // Append new results to existing results
      return next ?? prev;
    },
  }),

  // ===== AGENT CONTROL =====
  // Agent's decision about what to do next
  nextAction: Annotation<"fetch_pr" | "analyze_file" | "finish">({
    default: () => "fetch_pr",
    reducer: (prev, next) => next ?? prev,
  }),

  // ===== ERROR HANDLING =====
  // Error information if something goes wrong
  error: Annotation<string | null>({
    default: () => null,
    reducer: (prev, next) => next ?? prev,
  }),
});

/**
 * TypeScript type for the agent state
 * Use this type when working with the state in your code
 */
export type AgentStateType = typeof AgentState.State;
