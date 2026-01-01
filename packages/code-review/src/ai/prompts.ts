import type { ParsedFile, ChangedLine } from '../models';

export const SYSTEM_PROMPT = `You are an expert code reviewer with deep knowledge of software engineering best practices, security vulnerabilities, and performance optimization.

Your task is to analyze code changes in pull requests and identify issues across these categories:
- BUG: Potential bugs, logic errors, or runtime issues
- SECURITY: Security vulnerabilities or unsafe practices
- PERFORMANCE: Performance issues or inefficient code
- STYLE: Code style inconsistencies or formatting issues
- BEST_PRACTICE: Violations of coding best practices or design patterns

For each issue you find, provide:
1. The exact line number where the issue occurs
2. A clear description of the problem
3. A specific suggestion on how to fix it

Focus on issues in the ADDED lines (lines that start with +). Be thorough but avoid false positives.`;

export function buildAnalysisPrompt(file: ParsedFile): string {
  const addedLines = file.changes.filter(c => c.type === 'added');

  if (addedLines.length === 0) {
    return '';
  }

  const changesFormatted = formatChanges(file.changes);

  return `Analyze the following ${file.language} code changes:

File: ${file.filename}
Status: ${file.status}
Language: ${file.language}

Code changes (with line numbers):
${changesFormatted}

Find and report issues ONLY in the added lines (marked with +).

Return your analysis as a JSON object with this exact structure:
{
  "issues": [
    {
      "type": "BUG" | "SECURITY" | "PERFORMANCE" | "STYLE" | "BEST_PRACTICE",
      "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      "line": <line_number>,
      "description": "<clear description of the issue>",
      "suggestion": "<specific actionable fix or recommendation>"
    }
  ]
}

If no issues are found, return: {"issues": []}

Important:
- Only report issues in ADDED lines (those with + prefix)
- Line numbers must match the actual line numbers in the code
- Be specific and actionable in descriptions
- Avoid false positives - only report genuine issues`;
}

function formatChanges(changes: ChangedLine[]): string {
  return changes.map(change => {
    const prefix = change.type === 'added' ? '+' : change.type === 'removed' ? '-' : ' ';
    return `${prefix} ${change.lineNumber}: ${change.content}`;
  }).join('\n');
}
