import { Hono } from 'hono';
import { logger as honoLogger } from 'hono/logger';
import { cors } from 'hono/cors';
import { healthRoute } from './routes/health';
import { analysisRoute } from './routes/analysis';
import { errorHandler } from './middleware/error-handler';
import { env } from './config/env';
import { logger } from './utils/logger';

const app = new Hono();

// Middleware
app.use('*', honoLogger());
app.use('*', cors());

// Error handling
app.onError(errorHandler);

// Routes
app.route('/health', healthRoute);
app.route('/api', analysisRoute);

// 404 handler
app.notFound((c) => c.json({ error: 'Not Found' }, 404));

// Start server
const server = Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
});

logger.info(`🚀 API Server running on http://localhost:${env.PORT}`);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.stop();
  process.exit(0);
});

export default app;
