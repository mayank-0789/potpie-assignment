// GitHub PR file data from API (simplified - only fields we use)
export interface GitHubFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string; // Git diff patch containing line changes
}

// GitHub PR metadata (only fields we store in database)
export interface GitHubPR {
  title: string;
  user: { login: string };
}

// Individual line change from git diff patch
export interface ChangedLine {
  lineNumber: number;
  content: string;
  type: 'added' | 'removed' | 'context';
}

// Parsed file ready for AI analysis - includes filename, language, status, and line-by-line changes
export interface ParsedFile {
  filename: string;
  language: string;
  status: 'added' | 'modified' | 'removed';
  additions: number;
  deletions: number;
  changes: ChangedLine[];
}
