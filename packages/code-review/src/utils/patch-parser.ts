import type { ChangedLine } from '../models/github';

/**
 * Parse git diff patch to extract changed lines
 *
 * Patch format example:
 * @@ -10,7 +10,8 @@ function example() {
 *   context line
 * - removed line
 * + added line
 *   context line
 */
export function parsePatch(patch: string): ChangedLine[] {
  const lines = patch.split('\n');
  const changes: ChangedLine[] = [];

  let currentLineNumber = 0;

  for (const line of lines) {
    // Parse hunk header: @@ -10,7 +10,8 @@
    if (line.startsWith('@@')) {
      const match = line.match(/\+(\d+)/);
      if (match && match[1]) {
        currentLineNumber = parseInt(match[1], 10);
      }
      continue;
    }

    // Skip diff metadata
    if (line.startsWith('diff --git') ||
        line.startsWith('index ') ||
        line.startsWith('---') ||
        line.startsWith('+++')) {
      continue;
    }

    // Parse actual changes
    if (line.startsWith('+')) {
      changes.push({
        lineNumber: currentLineNumber,
        content: line.substring(1), // Remove the '+' prefix
        type: 'added',
      });
      currentLineNumber++;
    } else if (line.startsWith('-')) {
      changes.push({
        lineNumber: currentLineNumber,
        content: line.substring(1), // Remove the '-' prefix
        type: 'removed',
      });
      // Don't increment line number for removed lines
    } else if (line.startsWith(' ')) {
      // Context line
      changes.push({
        lineNumber: currentLineNumber,
        content: line.substring(1), // Remove the ' ' prefix
        type: 'context',
      });
      currentLineNumber++;
    } else if (line === '') {
      // Empty line
      continue;
    } else {
      // Context line without prefix (shouldn't happen in proper diffs, but handle it)
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