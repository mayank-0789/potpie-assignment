import { Annotation } from "@langchain/langgraph";
import type { ParsedFile, CodeIssue } from "../models";

// Agent state definition: defines the state that flows through the agent as it processes a code review task
export const AgentState = Annotation.Root({
  // Input: initial data provided by user
  repoUrl: Annotation<string>({
    reducer: (prev, next) => next ?? prev,
  }),
  prNumber: Annotation<number>({
    reducer: (prev, next) => next ?? prev,
  }),
  githubToken: Annotation<string>({
    reducer: (prev, next) => next ?? prev,
  }),

  // Intermediate state: data gathered during processing
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

  // Results: accumulated analysis results
  analyzedFiles: Annotation<Array<{ file: ParsedFile; issues: CodeIssue[] }>>({
    default: () => [],
    reducer: (prev, next) => next ?? prev, // Append new results to existing results
  }),

  // Agent control: agent's decision about what to do next
  nextAction: Annotation<"fetch_pr" | "analyze_file" | "finish">({
    default: () => "fetch_pr",
    reducer: (prev, next) => next ?? prev,
  }),

  // Error handling: error information if something goes wrong
  error: Annotation<string | null>({
    default: () => null,
    reducer: (prev, next) => next ?? prev,
  }),
});

// TypeScript type for the agent state - use this when working with state in code
export type AgentStateType = typeof AgentState.State;
