// Issue types matching database schema
export enum IssueType {
  STYLE = 'STYLE',
  BUG = 'BUG',
  PERFORMANCE = 'PERFORMANCE',
  BEST_PRACTICE = 'BEST_PRACTICE',
  SECURITY = 'SECURITY',
}

export enum IssueSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// Code issue
export interface CodeIssue {
  type: IssueType;
  severity: IssueSeverity;
  line: number;
  description: string;
  suggestion: string;
}

// Analysis result for a single file (used by worker)
export interface FileAnalysisResult {
  filename: string;
  language: string;
  issues: CodeIssue[];
}
