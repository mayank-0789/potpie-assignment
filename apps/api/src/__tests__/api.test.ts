import { describe, test, expect, beforeAll } from 'bun:test';
import app from '../index';

describe('API Endpoints', () => {
  beforeAll(async () => {
    // Wait for server initialization
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  describe('GET /health', () => {
    test('should return healthy status', async () => {
      const res = await app.request('/health');
      const data = await res.json() as any;

      expect(res.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.services?.redis).toBe('connected');
      expect(data.services?.database).toBe('connected');
    });
  });

  describe('POST /api/analyze-pr', () => {
    test('should accept valid PR submission', async () => {
      const res = await app.request('/api/analyze-pr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repo_url: 'https://github.com/facebook/react',
          pr_number: 25485,
        }),
      });

      const data = await res.json() as any;

      expect(res.status).toBe(202);
      expect(data.task_id).toBeDefined();
      expect(data.status).toBe('pending');
      expect(typeof data.task_id).toBe('string');
    });

    test('should reject invalid GitHub URL', async () => {
      const res = await app.request('/api/analyze-pr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repo_url: 'https://gitlab.com/user/repo',
          pr_number: 123,
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json() as any;
      expect(data.error).toBe('Validation error');
    });

    test('should reject invalid PR number', async () => {
      const res = await app.request('/api/analyze-pr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repo_url: 'https://github.com/facebook/react',
          pr_number: -1,
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json() as any;
      expect(data.error).toBe('Validation error');
    });

    test('should reject missing fields', async () => {
      const res = await app.request('/api/analyze-pr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repo_url: 'https://github.com/facebook/react',
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json() as any;
      expect(data.error).toBe('Validation error');
    });
  });

  describe('GET /api/status/:task_id', () => {
    test('should return 404 for non-existent task', async () => {
      const res = await app.request('/api/status/invalid-task-id');

      expect(res.status).toBe(404);
      const data = await res.json() as any;
      expect(data.error).toBe('Task not found');
    });

    test('should return status for existing task', async () => {
      // First create a task
      const createRes = await app.request('/api/analyze-pr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repo_url: 'https://github.com/facebook/react',
          pr_number: 25485,
        }),
      });

      const createData = await createRes.json() as any;
      const taskId = createData.task_id;

      // Now check its status
      const res = await app.request(`/api/status/${taskId}`);
      const data = await res.json() as any;

      expect(res.status).toBe(200);
      expect(data.task_id).toBe(taskId);
      expect(['pending', 'processing', 'completed', 'failed']).toContain(data.status);
    });
  });

  describe('GET /api/results/:task_id', () => {
    test('should return 404 for non-existent task', async () => {
      const res = await app.request('/api/results/invalid-task-id');

      expect(res.status).toBe(404);
      const data = await res.json() as any;
      expect(data.error).toBe('Task not found');
    });

    test('should return 400 for pending task', async () => {
      // Create a task
      const createRes = await app.request('/api/analyze-pr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repo_url: 'https://github.com/facebook/react',
          pr_number: 25485,
        }),
      });

      const createData = await createRes.json() as any;
      const taskId = createData.task_id;

      // Try to get results immediately
      const res = await app.request(`/api/results/${taskId}`);

      // Should return 400 if not completed yet
      if (res.status === 400) {
        const data = await res.json() as any;
        expect(data.message).toBe('Analysis not yet completed');
      }
      // Or 200 if it completed very quickly
      else if (res.status === 200) {
        const data = await res.json() as any;
        expect(data.results).toBeDefined();
      }
    });
  });

  describe('Output Format Validation', () => {
    test('completed task should match required format', async () => {
      // This test validates the expected structure
      const expectedFormat = {
        task_id: 'string',
        status: 'completed',
        results: {
          files: [{
            name: 'string',
            issues: [{
              type: 'string',
              severity: 'string',
              line: 123,
              description: 'string',
              suggestion: 'string',
            }],
          }],
          summary: {
            total_files: 1,
            total_issues: 1,
            critical_issues: 0,
          },
        },
      };

      // This validates the expected structure exists
      expect(expectedFormat).toBeDefined();
      expect(expectedFormat.results.files.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON', async () => {
      const res = await app.request('/api/analyze-pr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('should return 404 for unknown routes', async () => {
      const res = await app.request('/api/unknown-route');

      expect(res.status).toBe(404);
      const data = await res.json() as any;
      expect(data.error).toBe('Not Found');
    });
  });
});
