import Anthropic from '@anthropic-ai/sdk';
import type { ParsedFile, CodeIssue, IssueType, IssueSeverity } from '../models';
import { SYSTEM_PROMPT, buildAnalysisPrompt } from './prompts';

interface AIResponse {
  issues: Array<{
    type: string;
    severity: string;
    line: number;
    description: string;
    suggestion: string;
  }>;
}

interface AnalyzerConfig {
  apiKey: string;
  logger?: {
    info: (obj: any, msg?: string) => void;
    warn: (obj: any, msg?: string) => void;
    error: (obj: any, msg?: string) => void;
  };
}

/**
 * Code Analyzer using Claude AI
 */
export class CodeAnalyzer {
  private anthropic: Anthropic;
  private logger?: AnalyzerConfig['logger'];

  constructor(config: AnalyzerConfig) {
    this.anthropic = new Anthropic({
      apiKey: config.apiKey,
    });
    this.logger = config.logger;
  }

  /**
   * Analyze a file using Claude AI
   */
  async analyzeFile(file: ParsedFile): Promise<CodeIssue[]> {
    try {
      this.logger?.info({ filename: file.filename, language: file.language }, 'Analyzing file with AI');

      // Build prompt
      const prompt = buildAnalysisPrompt(file);

      // Skip if no added lines
      if (!prompt) {
        this.logger?.info({ filename: file.filename }, 'No added lines to analyze');
        return [];
      }

      // Call Claude API
      const response = await this.callClaude(prompt);

      // Parse and validate response
      const issues = this.parseAIResponse(response, file.filename);

      this.logger?.info(
        { filename: file.filename, issuesFound: issues.length },
        'File analysis complete'
      );

      return issues;
    } catch (error: any) {
      this.logger?.error(
        { filename: file.filename, error: error.message },
        'Failed to analyze file with AI'
      );
      // Don't fail the entire job if one file fails
      return [];
    }
  }

  /**
   * Call Claude API
   */
  private async callClaude(prompt: string): Promise<string> {
    const message = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      temperature: 0.3, // Lower temperature for more consistent analysis
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content && content.type === 'text') {
      return content.text;
    }

    throw new Error('Unexpected response format from Claude');
  }

  /**
   * Parse AI response into CodeIssue[]
   */
  private parseAIResponse(response: string, filename: string): CodeIssue[] {
    try {
      // Extract JSON from response (Claude might wrap it in markdown)
      let jsonStr = response.trim();

      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/```json\s*/, '').replace(/```\s*$/, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```\s*/, '').replace(/```\s*$/, '');
      }

      const parsed: AIResponse = JSON.parse(jsonStr);

      if (!parsed.issues || !Array.isArray(parsed.issues)) {
        this.logger?.warn({ filename }, 'AI response missing issues array');
        return [];
      }

      // Validate and transform issues
      const issues: CodeIssue[] = [];
      for (const issue of parsed.issues) {
        try {
          const validated = this.validateIssue(issue);
          issues.push(validated);
        } catch (error: any) {
          this.logger?.warn(
            { filename, issue, error: error.message },
            'Skipping invalid issue from AI'
          );
        }
      }

      return issues;
    } catch (error: any) {
      this.logger?.error(
        { filename, error: error.message, response: response.substring(0, 200) },
        'Failed to parse AI response'
      );
      return [];
    }
  }

  /**
   * Validate and transform a single issue
   */
  private validateIssue(issue: any): CodeIssue {
    // Validate type
    const validTypesStrings = ['STYLE', 'BUG', 'PERFORMANCE', 'BEST_PRACTICE', 'SECURITY'];
    const type = issue.type?.toUpperCase();
    if (!validTypesStrings.includes(type)) {
      throw new Error(`Invalid issue type: ${issue.type}`);
    }

    // Validate severity
    const validSeveritiesStrings = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const severity = issue.severity?.toUpperCase();
    if (!validSeveritiesStrings.includes(severity)) {
      throw new Error(`Invalid severity: ${issue.severity}`);
    }

    // Validate line number
    const line = parseInt(issue.line);
    if (isNaN(line) || line < 1) {
      throw new Error(`Invalid line number: ${issue.line}`);
    }

    // Validate description
    if (!issue.description || typeof issue.description !== 'string') {
      throw new Error('Missing or invalid description');
    }

    // Validate suggestion
    if (!issue.suggestion || typeof issue.suggestion !== 'string') {
      throw new Error('Missing or invalid suggestion');
    }

    return {
      type: type as IssueType,
      severity: severity as IssueSeverity,
      line,
      description: issue.description.trim(),
      suggestion: issue.suggestion.trim(),
    };
  }
}
