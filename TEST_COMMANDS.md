# Quick Test Commands Reference

This is a quick reference for running tests. For detailed testing information, see [TESTING.md](TESTING.md).

---

## 🚀 Quick Start

```bash
# From root directory
bun test
```

---

## 📋 Available Test Commands

### From Root Directory

```bash
# Run all tests across all packages
bun test

# Run API endpoint tests only
bun test:api

# Run integration tests only
bun test:integration

# Run agent framework tests only
bun test:agent
```

### From apps/api Directory

```bash
cd apps/api

# Run all API tests
bun test

# Run with watch mode
bun test:watch

# Run API endpoint tests only
bun test:api

# Run integration tests only
bun test:integration
```

### From packages/code-review Directory

```bash
cd packages/code-review

# Run all agent tests
bun test

# Run with watch mode
bun test:watch

# Run agent tests specifically
bun test:agent
```

---

## ✅ Test Checklist for Reviewers

Before running tests, ensure:

- [x] Redis is running: `docker compose up -d`
- [x] API server is running: `cd apps/api && bun dev`
- [x] Worker is running: `cd apps/worker && bun dev`
- [x] Environment variables are set in `.env`

---

## 📊 Expected Results

When all tests pass, you should see:

```
✓ API Endpoints (12 tests)
✓ CodeReviewAgent - LangGraph Implementation (15 tests)
✓ Integration Tests - Complete PR Analysis Flow (3 tests)
✓ Assignment Requirements Checklist (7 tests)
✓ Bonus Features Checklist (4 tests)
✓ Performance and Reliability (2 tests)

Total: 43 tests passed
```

---

## 🐛 If Tests Fail

1. **Check services are running:**
   ```bash
   docker ps  # Should show potpie-redis
   curl http://localhost:3001/health  # Should return healthy
   ```

2. **Check environment:**
   ```bash
   cat .env  # Verify all variables are set
   ```

3. **See detailed troubleshooting:**
   - Read [TESTING.md](TESTING.md#troubleshooting)

---

## 📖 Full Documentation

For comprehensive testing documentation, including:
- Test structure and coverage
- Assignment requirements validation
- Manual testing guide
- Troubleshooting

See **[TESTING.md](TESTING.md)**
