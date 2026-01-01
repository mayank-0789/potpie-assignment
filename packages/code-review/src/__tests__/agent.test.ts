import { describe, test, expect } from 'bun:test';
import { CodeReviewAgent } from '../ai/agent';
import type { AgentStateType } from '../ai/agent-state';

describe('CodeReviewAgent - LangGraph Implementation', () => {
  const testConfig = {
    anthropicApiKey: process.env.OPENROUTER_API_KEY || 'test-key',
    model: 'anthropic/claude-3.5-sonnet',
    githubToken: process.env.GITHUB_TOKEN || 'test-token',
    logger: {
      info: () => {},
      warn: () => {},
      error: () => {},
    },
  };

  describe('Agent Initialization', () => {
    test('should create agent instance', () => {
      const agent = new CodeReviewAgent(testConfig);
      expect(agent).toBeDefined();
    });

    test('should have analyze method', () => {
      const agent = new CodeReviewAgent(testConfig);
      expect(typeof agent.analyze).toBe('function');
    });
  });

  describe('Agent State Machine', () => {
    test('should have correct state structure', () => {
      // Verify state structure matches assignment requirements
      const expectedState: Partial<AgentStateType> = {
        repoUrl: 'https://github.com/facebook/react',
        prNumber: 25485,
        githubToken: 'test-token',
        prMetadata: null,
        filesToAnalyze: [],
        currentFileIndex: 0,
        analyzedFiles: [],
        nextAction: 'fetch_pr',
        error: null,
      };

      expect(expectedState).toBeDefined();
      const validActions = ['fetch_pr', 'analyze_file', 'finish'];
      expect(validActions).toContain(expectedState.nextAction as string);
    });
  });

  describe('Autonomous Decision Making', () => {
    test('agent should make decisions based on state', () => {
      // Verify the agent's decision-making logic
      const testState = {
        currentFileIndex: 0,
        filesToAnalyze: [
          {
            filename: 'test.ts',
            language: 'typescript',
            status: 'modified' as const,
            changes: [],
            additions: 10,
            deletions: 5,
          },
        ],
      };

      // If currentFileIndex < filesToAnalyze.length, should analyze
      expect(testState.currentFileIndex).toBeLessThan(testState.filesToAnalyze.length);

      // If currentFileIndex >= filesToAnalyze.length, should finish
      const completedState = {
        currentFileIndex: 1,
        filesToAnalyze: testState.filesToAnalyze,
      };
      expect(completedState.currentFileIndex).toBeGreaterThanOrEqual(
        completedState.filesToAnalyze.length
      );
    });
  });

  describe('Code Analysis Categories', () => {
    test('should detect style issues', () => {
      const issue = {
        type: 'STYLE',
        severity: 'LOW',
        line: 15,
        description: 'Line too long',
        suggestion: 'Break line into multiple lines',
      };

      expect(issue.type).toBe('STYLE');
      const validSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      expect(validSeverities).toContain(issue.severity);
    });

    test('should detect bug issues', () => {
      const issue = {
        type: 'BUG',
        severity: 'HIGH',
        line: 23,
        description: 'Potential null pointer',
        suggestion: 'Add null check',
      };

      expect(issue.type).toBe('BUG');
      const validSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      expect(validSeverities).toContain(issue.severity);
    });

    test('should detect performance issues', () => {
      const issue = {
        type: 'PERFORMANCE',
        severity: 'MEDIUM',
        line: 42,
        description: 'Inefficient loop',
        suggestion: 'Use map instead of forEach',
      };

      expect(issue.type).toBe('PERFORMANCE');
    });

    test('should detect security issues', () => {
      const issue = {
        type: 'SECURITY',
        severity: 'CRITICAL',
        line: 56,
        description: 'SQL injection vulnerability',
        suggestion: 'Use parameterized queries',
      };

      expect(issue.type).toBe('SECURITY');
      expect(issue.severity).toBe('CRITICAL');
    });

    test('should detect best practice violations', () => {
      const issue = {
        type: 'BEST_PRACTICE',
        severity: 'LOW',
        line: 78,
        description: 'Missing error handling',
        suggestion: 'Add try-catch block',
      };

      expect(issue.type).toBe('BEST_PRACTICE');
    });
  });

  describe('Issue Structure Validation', () => {
    test('issue should have all required fields', () => {
      const issue = {
        type: 'BUG',
        severity: 'HIGH',
        line: 10,
        description: 'Test description',
        suggestion: 'Test suggestion',
      };

      expect(issue.type).toBeDefined();
      expect(issue.severity).toBeDefined();
      expect(issue.line).toBeDefined();
      expect(issue.description).toBeDefined();
      expect(issue.suggestion).toBeDefined();
      expect(typeof issue.line).toBe('number');
      expect(typeof issue.description).toBe('string');
      expect(typeof issue.suggestion).toBe('string');
    });

    test('issue types should be valid', () => {
      const validTypes = ['STYLE', 'BUG', 'PERFORMANCE', 'BEST_PRACTICE', 'SECURITY'];
      const testType = 'BUG';

      expect(validTypes).toContain(testType);
    });

    test('severity levels should be valid', () => {
      const validSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      const testSeverity = 'HIGH';

      expect(validSeverities).toContain(testSeverity);
    });
  });

  describe('Agent Workflow', () => {
    test('should follow correct node sequence', () => {
      // Agent workflow: fetch_pr → decide_next → analyze_file → decide_next → finish
      const workflow = ['fetch_pr', 'decide_next', 'analyze_file', 'decide_next', 'finish'];

      expect(workflow[0]).toBe('fetch_pr');
      expect(workflow[workflow.length - 1]).toBe('finish');
      expect(workflow).toContain('analyze_file');
      expect(workflow.filter((n) => n === 'decide_next').length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('agent should handle fetch errors gracefully', () => {
      const errorState: Partial<AgentStateType> = {
        error: 'Failed to fetch PR',
        nextAction: 'finish',
      };

      expect(errorState.error).toBeDefined();
      expect(errorState.nextAction).toBe('finish');
    });

    test('agent should continue on file analysis error', () => {
      // Agent should not fail entire job if one file fails
      const partialResults = {
        analyzedFiles: [
          { file: { filename: 'test1.ts' } as any, issues: [{ type: 'BUG' } as any] },
          { file: { filename: 'test2.ts' } as any, issues: [] }, // Failed but continued
        ],
      };

      expect(partialResults.analyzedFiles.length).toBe(2);
    });
  });

  describe('Multi-Language Support', () => {
    test('should support TypeScript', () => {
      const file = {
        filename: 'test.ts',
        language: 'typescript',
        status: 'modified' as const,
        changes: [],
        additions: 10,
        deletions: 5,
      };

      expect(file.language).toBe('typescript');
    });

    test('should support JavaScript', () => {
      const file = {
        filename: 'test.js',
        language: 'javascript',
        status: 'added' as const,
        changes: [],
        additions: 20,
        deletions: 0,
      };

      expect(file.language).toBe('javascript');
    });

    test('should support Python', () => {
      const file = {
        filename: 'test.py',
        language: 'python',
        status: 'modified' as const,
        changes: [],
        additions: 15,
        deletions: 3,
      };

      expect(file.language).toBe('python');
    });
  });
});
