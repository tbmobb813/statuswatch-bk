# Testing Guide

This guide covers testing strategies and procedures for StatusWatch.

## Test Structure

```
statuswatch/
├── src/
│   └── __tests__/          # Backend unit tests
├── frontend/
│   └── __tests__/          # Frontend unit tests
├── e2e/                    # End-to-end tests
└── scripts/
    └── test-api.sh         # API integration tests
```

## Running Tests

### All Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

### Backend Tests

```bash
# Unit tests
npm run test:backend

# Watch mode
npm run test:backend -- --watch

# Single file
npm run test:backend -- auth.test.ts
```

### Frontend Tests

```bash
cd frontend

# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### End-to-End Tests

```bash
# Run e2e tests (requires running app)
npm run test:e2e

# With UI
npm run test:e2e:ui

# Specific browser
npm run test:e2e -- --project=chromium
```

## Test Categories

### 1. Unit Tests

Test individual functions and components in isolation.

**Backend Example:**
```typescript
// src/__tests__/services/auth.test.ts
import { hashPassword, verifyPassword } from '../../services/auth';

describe('Auth Service', () => {
  it('should hash password correctly', async () => {
    const password = 'testPassword123';
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    expect(hash).toHaveLength(60); // bcrypt hash length
  });

  it('should verify correct password', async () => {
    const password = 'testPassword123';
    const hash = await hashPassword(password);

    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it('should reject incorrect password', async () => {
    const hash = await hashPassword('correctPassword');

    const isValid = await verifyPassword('wrongPassword', hash);
    expect(isValid).toBe(false);
  });
});
```

**Frontend Example:**
```typescript
// frontend/__tests__/components/ServiceCard.test.tsx
import { render, screen } from '@testing-library/react';
import { ServiceCard } from '../../components/ServiceCard';

describe('ServiceCard', () => {
  const mockService = {
    slug: 'github',
    name: 'GitHub',
    status: 'operational',
    lastChecked: new Date(),
  };

  it('renders service name', () => {
    render(<ServiceCard service={mockService} />);
    expect(screen.getByText('GitHub')).toBeInTheDocument();
  });

  it('shows operational status', () => {
    render(<ServiceCard service={mockService} />);
    expect(screen.getByText('Operational')).toBeInTheDocument();
  });

  it('displays uptime percentage', () => {
    render(<ServiceCard service={mockService} />);
    expect(screen.getByText(/99\.95% uptime/)).toBeInTheDocument();
  });
});
```

### 2. Integration Tests

Test API endpoints with database.

```typescript
// src/__tests__/routes/services.test.ts
import request from 'supertest';
import { app } from '../../server';
import { prisma } from '../../lib/prisma';

describe('Services API', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/services', () => {
    it('returns list of services', async () => {
      const response = await request(app)
        .get('/api/services')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/services/:slug', () => {
    it('returns service by slug', async () => {
      const response = await request(app)
        .get('/api/services/github')
        .expect(200);

      expect(response.body.data.slug).toBe('github');
    });

    it('returns 404 for unknown service', async () => {
      await request(app)
        .get('/api/services/unknown')
        .expect(404);
    });
  });
});
```

### 3. End-to-End Tests

Test full user flows with Playwright.

```typescript
// e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('loads and displays services', async ({ page }) => {
    await page.goto('/');

    // Wait for loading to complete
    await expect(page.locator('.animate-pulse')).toHaveCount(0);

    // Check header
    await expect(page.locator('h1')).toContainText('StatusWatch');

    // Check services are displayed
    const serviceCards = page.locator('[data-testid="service-card"]');
    await expect(serviceCards).toHaveCount.greaterThan(0);
  });

  test('shows status banner', async ({ page }) => {
    await page.goto('/');

    const banner = page.locator('[data-testid="status-banner"]');
    await expect(banner).toBeVisible();
  });

  test('toggles dark mode', async ({ page }) => {
    await page.goto('/');

    // Click theme toggle
    await page.click('[aria-label="Switch to dark mode"]');

    // Verify dark mode applied
    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);
  });

  test('expands incident details', async ({ page }) => {
    await page.goto('/');

    // Find and click "Show details" button
    const showDetails = page.locator('text=Show details').first();
    if (await showDetails.isVisible()) {
      await showDetails.click();

      // Verify details expanded
      await expect(page.locator('text=Hide details').first()).toBeVisible();
    }
  });
});
```

### 4. API Contract Tests

Test API against OpenAPI spec.

```typescript
// src/__tests__/api-contract.test.ts
import SwaggerParser from '@apidevtools/swagger-parser';

describe('API Contract', () => {
  it('validates OpenAPI spec', async () => {
    const api = await SwaggerParser.validate('./src/config/swagger.ts');
    expect(api.info.title).toBe('StatusWatch API');
  });
});
```

## Testing Specific Features

### Authentication

```typescript
describe('Authentication', () => {
  it('registers new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        name: 'Test User',
        password: 'SecurePass123!',
      })
      .expect(200);

    expect(response.body.data.token).toBeDefined();
  });

  it('logs in existing user', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123!',
      })
      .expect(200);

    expect(response.body.data.token).toBeDefined();
  });

  it('rejects invalid credentials', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'wrongpassword',
      })
      .expect(401);
  });
});
```

### Rate Limiting

```typescript
describe('Rate Limiting', () => {
  it('limits requests', async () => {
    // Make 100 requests
    for (let i = 0; i < 100; i++) {
      await request(app).get('/api/health');
    }

    // 101st request should be rate limited
    const response = await request(app)
      .get('/api/health')
      .expect(429);

    expect(response.body.error).toContain('Too many requests');
  });
});
```

### Custom Services

```typescript
describe('Custom Services', () => {
  let authToken: string;

  beforeAll(async () => {
    // Login and get token
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.com', password: 'pass' });
    authToken = res.body.data.token;
  });

  it('creates custom service', async () => {
    const response = await request(app)
      .post('/api/custom-services')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'My API',
        url: 'https://api.example.com/health',
        checkInterval: 300,
      })
      .expect(201);

    expect(response.body.data.name).toBe('My API');
  });

  it('respects tier limits', async () => {
    // Create max services for free tier (3)
    // 4th should fail
    await request(app)
      .post('/api/custom-services')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Service 4', url: 'https://test.com' })
      .expect(403);
  });
});
```

## Test Utilities

### Mock Data Factory

```typescript
// src/__tests__/factories/index.ts
import { faker } from '@faker-js/faker';

export const createMockUser = (overrides = {}) => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  name: faker.person.fullName(),
  role: 'user',
  ...overrides,
});

export const createMockService = (overrides = {}) => ({
  id: faker.string.uuid(),
  slug: faker.helpers.slugify(faker.company.name()),
  name: faker.company.name(),
  status: 'operational',
  ...overrides,
});

export const createMockIncident = (overrides = {}) => ({
  id: faker.string.uuid(),
  title: faker.lorem.sentence(),
  status: 'investigating',
  impact: 'minor',
  ...overrides,
});
```

### Test Database

```typescript
// src/__tests__/setup.ts
import { prisma } from '../lib/prisma';

beforeEach(async () => {
  // Clean database before each test
  await prisma.incident.deleteMany();
  await prisma.customService.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

## Coverage Requirements

Target coverage thresholds:

```json
// jest.config.js
{
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  }
}
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test

      - name: Run tests
        run: npm test -- --coverage
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Manual Testing Checklist

Before each release:

- [ ] Login/Register flows
- [ ] Dashboard loads correctly
- [ ] Dark mode toggle works
- [ ] Service cards display status
- [ ] Uptime chart renders
- [ ] Incidents list loads
- [ ] Progressive disclosure (expand/collapse)
- [ ] Toast notifications appear
- [ ] Mobile responsive layout
- [ ] API documentation accessible at /api-docs
