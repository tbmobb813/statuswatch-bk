# Integration tests

This project includes integration tests that require a local Postgres and Redis instance.

Use the included `docker-compose.test.yml` to start the required services (Postgres + Redis).

Quick start

1. Start the test services:

```bash
docker compose -f docker-compose.test.yml up -d --build

2. Wait for services to become healthy (the CI workflow does this automatically). Locally you can run:

```bash
# Wait for Postgres
for i in {1..60}; do docker compose -f docker-compose.test.yml exec -T db pg_isready -h db -U statuswatch -d statuswatch_test && break || true; echo "Waiting for Postgres... ($i)"; sleep 1; done

# Wait for Redis
for i in {1..30}; do docker compose -f docker-compose.test.yml exec -T redis redis-cli ping && break || true; echo "Waiting for Redis... ($i)"; sleep 1; done

3. Run the test suites (unit + integration):

```bash
# Install deps if needed
npm ci

# Run jest (unit + integration)
npm run test:unit

4. Tear down when done:

```bash
docker compose -f docker-compose.test.yml down --volumes
```

Troubleshooting

- If tests skip Redis-dependent assertions, ensure Redis is reachable on the port defined in `docker-compose.test.yml` (default: `6379`).
- If Jest reports open handles, make sure processes are shut down and Prisma has disconnected. Worker processes may need to be terminated when running tests locally.

CI notes

The repository's CI workflow (`.github/workflows/integration.yml`) already brings up `docker-compose.test.yml` before running the tests and tears it down afterwards.
