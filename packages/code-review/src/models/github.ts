// GitHub PR File (simplified - only what we actually use)
export interface GitHubFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;  // The git diff - most important!
}

// GitHub PR metadata (only what we store in DB)
export interface GitHubPR {
  title: string;
  user: { login: string };
}

// Individual line change from git diff - ESSENTIAL
export interface ChangedLine {
  lineNumber: number;
  content: string;
  type: 'added' | 'removed' | 'context';
}

// Parsed file ready for AI analysis - ESSENTIAL
export interface ParsedFile {
  filename: string;
  language: string;
  status: 'added' | 'modified' | 'removed';
  additions: number;
  deletions: number;
  changes: ChangedLine[];
}
