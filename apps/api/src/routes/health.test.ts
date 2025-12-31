import { describe, test, expect } from 'bun:test';
import { Hono } from 'hono';
import { healthRoute } from './health';

describe('Health Check Endpoint', () => {
  const app = new Hono();
  app.route('/health', healthRoute);

  test('should respond to GET /health', async () => {
    const res = await app.request('/health');

    // Will be 200 or 503 depending on Redis/DB availability
    expect([200, 503]).toContain(res.status);
  });

  test('should return JSON response', async () => {
    const res = await app.request('/health');
    const json = await res.json() as any;

    expect(json).toBeDefined();
    expect(json).toHaveProperty('status');
  });

  test('should include timestamp in healthy response', async () => {
    const res = await app.request('/health');
    const json = await res.json() as any;

    if (res.status === 200) {
      expect(json).toHaveProperty('timestamp');
      expect(json).toHaveProperty('services');
      expect(json.services).toHaveProperty('redis');
      expect(json.services).toHaveProperty('database');
    }
  });

  test('should return unhealthy status on service failure', async () => {
    const res = await app.request('/health');
    const json = await res.json() as any;

    if (res.status === 503) {
      expect(json.status).toBe('unhealthy');
      expect(json).toHaveProperty('error');
    }
  });

  test('should have correct content type', async () => {
    const res = await app.request('/health');

    expect(res.headers.get('content-type')).toContain('application/json');
  });
});
