# Monitoring Guide

This guide covers setting up monitoring, alerting, and observability for StatusWatch.

## Monitoring Stack Options

### Recommended Stack

- **Error Tracking**: Sentry
- **APM**: DataDog or New Relic
- **Logs**: Loki + Grafana or ELK Stack
- **Metrics**: Prometheus + Grafana
- **Uptime**: StatusWatch itself + external (Pingdom, UptimeRobot)

## Error Tracking with Sentry

### Installation

```bash
# Backend
npm install @sentry/node

# Frontend
cd frontend
npm install @sentry/nextjs
```

### Backend Configuration

```typescript
// src/lib/sentry.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app }),
    new Sentry.Integrations.Prisma({ client: prisma }),
  ],
});

// Add to Express app
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// Error handler (after routes)
app.use(Sentry.Handlers.errorHandler());
```

### Frontend Configuration

```typescript
// frontend/sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

### Environment Variables

```bash
# Backend
SENTRY_DSN=https://xxx@sentry.io/xxx

# Frontend
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
```

## Application Performance Monitoring (APM)

### DataDog Setup

```bash
npm install dd-trace
```

```typescript
// src/lib/datadog.ts
import tracer from 'dd-trace';

tracer.init({
  service: 'statuswatch-backend',
  env: process.env.NODE_ENV,
  logInjection: true,
});

export default tracer;
```

### Key Metrics to Track

1. **Response Times**
   - API endpoint latency (p50, p95, p99)
   - Database query duration
   - External API call duration

2. **Error Rates**
   - HTTP 4xx/5xx rates
   - Unhandled exceptions
   - Failed background jobs

3. **Throughput**
   - Requests per second
   - Active users
   - Background job processing rate

4. **Resource Usage**
   - CPU utilization
   - Memory usage
   - Database connections

## Structured Logging

### Winston Setup

```bash
npm install winston
```

```typescript
// src/lib/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'statuswatch' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

export default logger;
```

### Log Levels

- **error**: Application errors requiring immediate attention
- **warn**: Unusual conditions that should be reviewed
- **info**: General operational events
- **debug**: Detailed debugging information

### Structured Log Example

```typescript
logger.info('Service check completed', {
  serviceId: service.id,
  serviceName: service.name,
  status: result.status,
  responseTime: result.responseTime,
  timestamp: new Date().toISOString(),
});
```

## Metrics with Prometheus

### Setup

```bash
npm install prom-client
```

```typescript
// src/lib/metrics.ts
import { Registry, Counter, Histogram, Gauge } from 'prom-client';

const registry = new Registry();

// Request counter
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [registry],
});

// Response time histogram
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [registry],
});

// Active services gauge
export const activeServicesGauge = new Gauge({
  name: 'active_services_total',
  help: 'Number of active monitored services',
  registers: [registry],
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});
```

### Grafana Dashboard

Import dashboard with:

- Request rate panel
- Error rate panel
- Response time percentiles
- Active services
- Database connection pool status

## Health Checks

### Comprehensive Health Endpoint

```typescript
// src/routes/health.ts
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      memory: checkMemory(),
    },
  };

  const isHealthy = Object.values(health.checks).every(c => c.status === 'ok');

  res.status(isHealthy ? 200 : 503).json(health);
});

async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', latency: '5ms' };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

function checkMemory() {
  const used = process.memoryUsage();
  const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
  return {
    status: heapUsedMB < 500 ? 'ok' : 'warning',
    heapUsed: `${heapUsedMB}MB`,
  };
}
```

### Kubernetes Probes

```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 5555
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /api/health
    port: 5555
  initialDelaySeconds: 5
  periodSeconds: 5
```

## Alerting

### Alert Rules (Prometheus/Grafana)

```yaml
# alerts.yml
groups:
  - name: statuswatch
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: High error rate detected
          description: Error rate is {{ $value }} errors/sec

      - alert: SlowResponses
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: Slow response times
          description: 95th percentile response time is {{ $value }}s

      - alert: DatabaseDown
        expr: up{job="postgres"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: Database is down

      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes > 1073741824
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High memory usage (> 1GB)
```

### Notification Channels

Configure alerts to:

- **Slack**: `#ops-alerts` channel
- **PagerDuty**: For critical alerts
- **Email**: Daily digest of warnings

## External Uptime Monitoring

Don't rely solely on self-monitoring. Use external services:

### Recommended Services

1. **UptimeRobot** (Free tier available)
   - Monitor: `https://statuswatch.yourdomain.com/api/health`
   - Check interval: 5 minutes
   - Alert: Email + Slack

2. **Pingdom**
   - Real user monitoring
   - Transaction monitoring
   - Multi-location checks

3. **StatusCake**
   - Page speed monitoring
   - SSL certificate monitoring
   - Domain expiry alerts

### What to Monitor

- [ ] Frontend homepage loads
- [ ] API health endpoint responds
- [ ] SSL certificate valid (30+ days)
- [ ] DNS resolution works
- [ ] Response time < 2s

## Dashboard Setup

### Key Dashboards

1. **Operations Overview**
   - Service health status
   - Error rate trends
   - Response time graphs
   - Active incidents

2. **Infrastructure**
   - CPU/Memory usage
   - Database connections
   - Disk I/O
   - Network traffic

3. **Business Metrics**
   - Active users
   - API usage by endpoint
   - Custom services created
   - Tier distribution

### Example Grafana JSON

```json
{
  "title": "StatusWatch Overview",
  "panels": [
    {
      "title": "Request Rate",
      "type": "graph",
      "targets": [
        {
          "expr": "rate(http_requests_total[5m])"
        }
      ]
    },
    {
      "title": "Error Rate",
      "type": "stat",
      "targets": [
        {
          "expr": "rate(http_requests_total{status=~\"5..\"}[5m])"
        }
      ]
    }
  ]
}
```

## Incident Response

### On-Call Rotation

1. Set up PagerDuty or OpsGenie
2. Define escalation policies
3. Create runbooks for common issues

### Runbook Example

**Alert: Database Connection Pool Exhausted**

1. Check current connections: `SELECT count(*) FROM pg_stat_activity;`
2. Identify long-running queries: `SELECT * FROM pg_stat_activity WHERE state = 'active';`
3. Kill problematic queries if needed: `SELECT pg_terminate_backend(pid);`
4. Scale up connection pool in config
5. Restart application if necessary

### Post-Incident Review

After each incident:

1. Document timeline
2. Identify root cause
3. List action items
4. Update monitoring/alerts
5. Share learnings

## Cost Optimization

### Free Tiers Available

- **Sentry**: 5K errors/month
- **UptimeRobot**: 50 monitors
- **Grafana Cloud**: 10K metrics
- **Logtail**: 1GB/month

### Self-Hosted Alternatives

- **Grafana + Prometheus + Loki**: Full observability stack
- **Plausible**: Privacy-friendly analytics
- **Umami**: Simple website analytics
