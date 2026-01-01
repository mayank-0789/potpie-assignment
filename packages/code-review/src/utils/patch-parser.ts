import type { ChangedLine } from '../models/github';

// Parses git diff patch to extract changed lines: handles hunk headers (@@), skips metadata, parses added/removed/context lines
export function parsePatch(patch: string): ChangedLine[] {
  const lines = patch.split('\n');
  const changes: ChangedLine[] = [];
  let currentLineNumber = 0;

  for (const line of lines) {
    // Parse hunk header to get starting line number (e.g., @@ -10,7 +10,8 @@)
    if (line.startsWith('@@')) {
      const match = line.match(/\+(\d+)/);
      if (match && match[1]) {
        currentLineNumber = parseInt(match[1], 10);
      }
      continue;
    }

    // Skip diff metadata lines
    if (line.startsWith('diff --git') || line.startsWith('index ') || line.startsWith('---') || line.startsWith('+++')) {
      continue;
    }

    // Parse added lines (starts with +)
    if (line.startsWith('+')) {
      changes.push({
        lineNumber: currentLineNumber,
        content: line.substring(1), // Remove '+' prefix
        type: 'added',
      });
      currentLineNumber++;
    } 
    // Parse removed lines (starts with -)
    else if (line.startsWith('-')) {
      changes.push({
        lineNumber: currentLineNumber,
        content: line.substring(1), // Remove '-' prefix
        type: 'removed',
      });
      // Don't increment line number for removed lines
    } 
    // Parse context lines (starts with space)
    else if (line.startsWith(' ')) {
      changes.push({
        lineNumber: currentLineNumber,
        content: line.substring(1), // Remove space prefix
        type: 'context',
      });
      currentLineNumber++;
    } 
    // Handle empty lines or context without prefix
    else if (line === '') {
      continue;
    } else {
      changes.push({
        lineNumber: currentLineNumber,
        content: line,
        type: 'context',
      });
      currentLineNumber++;
    }
  }

  return changes;
}