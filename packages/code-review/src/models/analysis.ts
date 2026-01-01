// Issue types matching database schema enum
export enum IssueType {
  STYLE = 'STYLE',
  BUG = 'BUG',
  PERFORMANCE = 'PERFORMANCE',
  BEST_PRACTICE = 'BEST_PRACTICE',
  SECURITY = 'SECURITY',
}

// Issue severity levels matching database schema enum
export enum IssueSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// Code issue found during analysis: type, severity, line number, description, and fix suggestion
export interface CodeIssue {
  type: IssueType;
  severity: IssueSeverity;
  line: number;
  description: string;
  suggestion: string;
}

// Analysis result for a single file (used by worker to store results)
export interface FileAnalysisResult {
  filename: string;
  language: string;
  issues: CodeIssue[];
}
