// Detects programming language from file extension (returns 'unknown' if extension not recognized)
export function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();

  const languageMap: Record<string, string> = {
    'js': 'javascript', 'jsx': 'javascript', 'ts': 'typescript', 'tsx': 'typescript', 'mjs': 'javascript', 'cjs': 'javascript',
    'py': 'python', 'pyw': 'python',
    'java': 'java',
    'c': 'c', 'cpp': 'cpp', 'cc': 'cpp', 'cxx': 'cpp', 'h': 'c', 'hpp': 'cpp',
    'go': 'go',
    'rs': 'rust',
    'rb': 'ruby',
    'php': 'php',
    'swift': 'swift',
    'kt': 'kotlin', 'kts': 'kotlin',
    'cs': 'csharp',
    'html': 'html', 'css': 'css', 'scss': 'scss', 'sass': 'sass', 'json': 'json', 'yaml': 'yaml', 'yml': 'yaml', 'xml': 'xml', 'md': 'markdown',
    'sh': 'shell', 'bash': 'shell', 'zsh': 'shell',
    'sql': 'sql',
  };

  return languageMap[ext || ''] || 'unknown';
}

// Checks if file should be analyzed: skips non-code files (json, yaml, etc.) and common build/test/config patterns
export function shouldAnalyzeFile(filename: string): boolean {
  const language = detectLanguage(filename);

  // Skip non-code files
  const skipLanguages = ['unknown', 'json', 'yaml', 'xml', 'markdown'];
  if (skipLanguages.includes(language)) {
    return false;
  }

  // Skip common patterns: node_modules, minified files, test files, lock files, config files, build outputs
  const skipPatterns = [
    /node_modules\//, /\.min\./, /\.test\./, /\.spec\./,
    /package-lock\.json/, /yarn\.lock/, /bun\.lock/, /pnpm-lock\.yaml/,
    /\.config\./, /dist\//, /build\//, /\.git\//,
  ];

  return !skipPatterns.some(pattern => pattern.test(filename));
}
