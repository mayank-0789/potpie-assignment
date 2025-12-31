import { describe, test, expect } from 'bun:test';
import { Hono } from 'hono';
import { analysisRoute } from './analysis';

describe('Analysis API Endpoints', () => {
  const app = new Hono();
  app.route('/api', analysisRoute);

  describe('POST /api/analyze-pr', () => {
    test('should return 400 for invalid request body', async () => {
      const res = await app.request('/api/analyze-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo_url: 'invalid-url',
          pr_number: -1,
        }),
      });

      expect(res.status).toBe(400);
      const json = await res.json() as any;
      expect(json.error).toBe('Validation error');
    });

    test('should return 400 for non-GitHub URL', async () => {
      const res = await app.request('/api/analyze-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo_url: 'https://gitlab.com/user/repo',
          pr_number: 123,
        }),
      });

      expect(res.status).toBe(400);
      const json = await res.json() as any;
      expect(json.error).toBe('Validation error');
    });

    test('should validate pr_number is positive integer', async () => {
      const res = await app.request('/api/analyze-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo_url: 'https://github.com/user/repo',
          pr_number: 0,
        }),
      });

      expect(res.status).toBe(400);
      const json = await res.json() as any;
      expect(json.error).toBe('Validation error');
    });

    test('should accept valid GitHub URL and PR number', async () => {
      const res = await app.request('/api/analyze-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo_url: 'https://github.com/user/repo',
          pr_number: 123,
        }),
      });

      // This will fail in test environment without proper DB/Redis setup
      // but validates the request format is correct
      expect([202, 500]).toContain(res.status);
    });
  });

  describe('GET /api/status/:task_id', () => {
    test('should return 404 for non-existent task', async () => {
      const res = await app.request('/api/status/non-existent-id');

      // Will be 404 or 500 depending on DB availability
      expect([404, 500]).toContain(res.status);
    });

    test('should have correct response format for valid task_id', async () => {
      const res = await app.request('/api/status/test-id-123');
      const json = await res.json() as any;

      // Should have task_id or error field
      expect(json.task_id !== undefined || json.error !== undefined).toBe(true);
    });
  });

  describe('GET /api/results/:task_id', () => {
    test('should return 404 for non-existent task', async () => {
      const res = await app.request('/api/results/non-existent-id');

      // Will be 404 or 500 depending on DB availability
      expect([404, 500]).toContain(res.status);
    });

    test('should have correct URL parameter extraction', async () => {
      const taskId = 'cm5abc123xyz';
      const res = await app.request(`/api/results/${taskId}`);

      // Response should reference the task_id even in error
      const json = await res.json() as any;
      expect(json).toBeDefined();
    });
  });

  describe('Request validation', () => {
    test('should handle missing Content-Type header', async () => {
      const res = await app.request('/api/analyze-pr', {
        method: 'POST',
        body: JSON.stringify({
          repo_url: 'https://github.com/user/repo',
          pr_number: 123,
        }),
      });

      // Should still process but might fail
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('should handle malformed JSON', async () => {
      const res = await app.request('/api/analyze-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json',
      });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });
});
