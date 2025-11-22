import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dns from 'dns/promises';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import statusRoutes from './routes/status.routes';
import incidentRoutes from './routes/incidents.routes';
import uptimeRoutes from './routes/uptime.routes';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import dashboardRoutes from './routes/dashboard.routes';
import customServicesRoutes from './routes/custom-services.routes';
import analyticsRoutes from './routes/analytics.routes';
import { CronService } from './services/cron.service';

const app = express();
const PORT = process.env.PORT || 5555;
const cronService = new CronService();

// Rate limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per windowMs
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use('/api/', generalLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Alias for docs/tests that expect /api/health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Swagger API documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'StatusWatch API Docs',
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Routes
app.use('/api/status', statusRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/uptime', uptimeRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/custom-services', customServicesRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Mark `_next` as used to satisfy unused-var lint rule (we intentionally
  // don't call it here because we handle the error response directly).
  void _next;
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints:`);
  console.log(`   - GET  /api/status          - Check all services`);
  console.log(`   - GET  /api/status/:slug    - Check specific service`);
  console.log(`   - POST /api/status/:slug/refresh - Force refresh`);
  
  // Dev-only: resolve DB host from DATABASE_URL and print addresses (helps debug IPv4/IPv6)
  if (process.env.NODE_ENV !== 'production') {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      try {
        const hostname = new URL(dbUrl).hostname;
        console.log(`\n🔎 Resolving database host from DATABASE_URL: ${hostname}`);
        dns.lookup(hostname, { all: true })
          .then((addrs) => {
            if (!addrs || addrs.length === 0) {
              console.log('  (no addresses returned)');
            } else {
              addrs.forEach((a) => console.log(`  - ${a.address} (family ${a.family})`));
            }
          })
          .catch((err) => {
            console.warn('Could not resolve DB host:', err && err.message ? err.message : err);
          });
      } catch (_err) {
        console.warn('Invalid DATABASE_URL, skipping DB host resolution', String(_err));
      }
    } else {
      console.log('DATABASE_URL not set; skipping DB host resolution');
    }
  }

  // Start cron jobs
  if (process.env.DEV_CRON === 'false') {
    console.log('\n⏸️ Cron jobs disabled in dev (DEV_CRON=false)');
  } else {
    cronService.startAll();
    console.log(`\n⏰ Automated monitoring started`);
  }
});

export default app;