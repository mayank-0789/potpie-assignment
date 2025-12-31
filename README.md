# AI Code Review Agent

An autonomous code review system that uses AI to analyze GitHub pull requests asynchronously. Built with TypeScript, Bun, and Claude AI.

## Features

- Analyzes GitHub PRs for code quality issues
- Asynchronous processing using BullMQ
- AI-powered analysis using Claude 3.5 Sonnet
- REST API for job submission and status tracking
- PostgreSQL database for result storage
- Detects issues in: style, bugs, performance, best practices, security

## Architecture

### Tech Stack

- **Runtime:** Bun 1.2.21
- **API Framework:** Hono
- **Queue System:** BullMQ + Redis
- **Database:** PostgreSQL (Neon) with Prisma ORM
- **AI/LLM:** Anthropic Claude 3.5 Sonnet
- **Validation:** Zod
- **Logging:** Pino
- **Monorepo:** Turborepo

### Project Structure

```
potpie/
├── apps/
│   ├── api/          # REST API server (Hono)
│   └── worker/       # BullMQ worker with Claude AI
├── packages/
│   ├── database/     # Prisma schema and client
│   └── code-review/  # GitHub integration and types
└── docker-compose.yml
```

### Design Decisions

1. **TypeScript over Python**: Chose Bun/TypeScript for better performance and modern tooling
2. **BullMQ over Celery**: Native TypeScript queue system with Redis
3. **Hono over FastAPI**: Lightweight, fast web framework for TypeScript
4. **Monorepo Structure**: Shared packages for code reuse between API and worker
5. **Prisma ORM**: Type-safe database queries with automatic migrations
6. **Claude AI**: State-of-the-art code understanding and analysis capabilities

## Setup Instructions

### Prerequisites

- Bun 1.2.21 or higher
- Docker and Docker Compose (for Redis)
- PostgreSQL database (or Neon account)
- GitHub Personal Access Token
- Anthropic API key

### 1. Clone and Install

```bash
# Clone the repository
git clone <repo-url>
cd potpie

# Install dependencies
bun install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://username:password@host/dbname

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# API Server
PORT=3001

# GitHub Personal Access Token (with 'repo' scope)
GITHUB_TOKEN=ghp_your_token_here

# Anthropic Claude API Key
ANTHROPIC_API_KEY=sk-ant-your_key_here

# Logging
LOG_LEVEL=info
NODE_ENV=development
```

### 3. Start Redis

```bash
docker-compose up -d
```

This starts Redis on `localhost:6379` with data persistence.

### 4. Setup Database

```bash
# Generate Prisma Client
bun prisma generate --schema=packages/database/prisma/schema.prisma

# Run migrations
bun prisma migrate deploy --schema=packages/database/prisma/schema.prisma
```

### 5. Start Services

Open two terminal windows:

**Terminal 1 - API Server:**
```bash
cd apps/api
bun dev
```

API will be available at `http://localhost:3001`

**Terminal 2 - Worker:**
```bash
cd apps/worker
bun dev
```

## API Documentation

### Base URL

```
http://localhost:3001/api
```

### Endpoints

#### 1. Analyze PR (Create Job)

**POST** `/analyze-pr`

Submit a GitHub PR for analysis.

**Request Body:**
```json
{
  "repo_url": "https://github.com/owner/repo",
  "pr_number": 123,
  "github_token": "optional_if_set_in_env"
}
```

**Response (202 Accepted):**
```json
{
  "task_id": "cm5abc123xyz",
  "status": "pending"
}
```

**Example cURL:**
```bash
curl -X POST http://localhost:3001/api/analyze-pr \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/owner/repo",
    "pr_number": 123
  }'
```

#### 2. Get Job Status

**GET** `/status/:task_id`

Check the status of an analysis job.

**Response:**
```json
{
  "task_id": "cm5abc123xyz",
  "status": "processing"
}
```

Status values: `pending`, `processing`, `completed`, `failed`

**Example cURL:**
```bash
curl http://localhost:3001/api/status/cm5abc123xyz
```

#### 3. Get Results

**GET** `/results/:task_id`

Retrieve analysis results (only available when status is `completed`).

**Response:**
```json
{
  "task_id": "cm5abc123xyz",
  "status": "completed",
  "results": {
    "files": [
      {
        "name": "src/main.ts",
        "issues": [
          {
            "type": "style",
            "severity": "low",
            "line": 15,
            "description": "Line exceeds 80 characters",
            "suggestion": "Break line into multiple lines for better readability"
          },
          {
            "type": "bug",
            "severity": "high",
            "line": 23,
            "description": "Potential null pointer exception",
            "suggestion": "Add null check before accessing property"
          }
        ]
      }
    ],
    "summary": {
      "total_files": 1,
      "total_issues": 2,
      "critical_issues": 0,
      "high_issues": 1,
      "medium_issues": 0,
      "low_issues": 1
    }
  }
}
```

**Example cURL:**
```bash
curl http://localhost:3001/api/results/cm5abc123xyz
```

## Issue Types

- **STYLE**: Code style and formatting issues
- **BUG**: Potential bugs or logic errors
- **SECURITY**: Security vulnerabilities
- **PERFORMANCE**: Performance issues or inefficiencies
- **BEST_PRACTICE**: Violations of coding best practices

## Severity Levels

- **CRITICAL**: Severe issues requiring immediate attention
- **HIGH**: Important issues that should be fixed
- **MEDIUM**: Moderate issues worth addressing
- **LOW**: Minor issues or suggestions

## Development

### Type Checking

```bash
bun run check-types
```

### Build

```bash
# Build API
cd apps/api
bun run build

# Build Worker
cd apps/worker
bun run build
```

### Database Migrations

```bash
# Create new migration
bun prisma migrate dev --schema=packages/database/prisma/schema.prisma

# Apply migrations
bun prisma migrate deploy --schema=packages/database/prisma/schema.prisma

# Reset database
bun prisma migrate reset --schema=packages/database/prisma/schema.prisma
```

## Testing

Run tests for the project:

```bash
bun test
```

## Future Improvements

1. **Caching Layer**
   - Cache analysis results for identical PR commits
   - Redis-based result caching to reduce API calls

2. **Rate Limiting**
   - Per-IP rate limiting on API endpoints
   - Queue-based rate limiting for GitHub API calls

3. **GitHub Webhooks**
   - Automatic analysis on PR creation/update
   - Real-time PR comments with analysis results

4. **Enhanced Features**
   - Support for more programming languages
   - Configurable analysis rules per repository
   - Custom AI prompts per project
   - Incremental analysis (only changed files)

5. **Testing & Quality**
   - Comprehensive unit tests for all services
   - Integration tests for API endpoints
   - E2E tests for complete workflow

6. **Deployment**
   - Live deployment on Railway/Render
   - CI/CD pipeline for automated deployments
   - Health checks and monitoring
   - Metrics and analytics dashboard

7. **Performance**
   - Parallel file analysis
   - Streaming responses for large PRs
   - Background cleanup of old jobs

8. **Security**
   - API key authentication
   - GitHub OAuth integration
   - Encrypted secret storage
   - Input sanitization

## Troubleshooting

### Redis Connection Issues

```bash
# Check if Redis is running
docker ps | grep redis

# View Redis logs
docker logs potpie-redis
```

### Database Connection Issues

```bash
# Test database connection
bun prisma db pull --schema=packages/database/prisma/schema.prisma
```

### Worker Not Processing Jobs

```bash
# Check worker logs
cd apps/worker
bun dev

# Check BullMQ queue status
# You can use BullBoard or Redis CLI to inspect queues
```

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## Support

For issues and questions, please create an issue on GitHub.
