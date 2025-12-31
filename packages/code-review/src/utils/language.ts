/**
 * Detect programming language from filename
 */
export function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();

  const languageMap: Record<string, string> = {
    // JavaScript/TypeScript
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'mjs': 'javascript',
    'cjs': 'javascript',

    // Python
    'py': 'python',
    'pyw': 'python',

    // Java
    'java': 'java',

    // C/C++
    'c': 'c',
    'cpp': 'cpp',
    'cc': 'cpp',
    'cxx': 'cpp',
    'h': 'c',
    'hpp': 'cpp',

    // Go
    'go': 'go',

    // Rust
    'rs': 'rust',

    // Ruby
    'rb': 'ruby',

    // PHP
    'php': 'php',

    // Swift
    'swift': 'swift',

    // Kotlin
    'kt': 'kotlin',
    'kts': 'kotlin',

    // C#
    'cs': 'csharp',

    // Markup/Config
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'xml': 'xml',
    'md': 'markdown',

    // Shell
    'sh': 'shell',
    'bash': 'shell',
    'zsh': 'shell',

    // SQL
    'sql': 'sql',
  };

  return languageMap[ext || ''] || 'unknown';
}

/**
 * Check if file should be analyzed
 */
export function shouldAnalyzeFile(filename: string): boolean {
  const language = detectLanguage(filename);

  // Skip non-code files
  const skipLanguages = ['unknown', 'json', 'yaml', 'xml', 'markdown'];
  if (skipLanguages.includes(language)) {
    return false;
  }

  // Skip certain file patterns
  const skipPatterns = [
    /node_modules\//,
    /\.min\./,
    /\.test\./,
    /\.spec\./,
    /package-lock\.json/,
    /yarn\.lock/,
    /bun\.lock/,
    /pnpm-lock\.yaml/,
    /\.config\./,
    /dist\//,
    /build\//,
    /\.git\//,
  ];

  return !skipPatterns.some(pattern => pattern.test(filename));
}
