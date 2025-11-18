import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import statusRoutes from './routes/status.routes';
import incidentRoutes from './routes/incidents.routes';
import uptimeRoutes from './routes/uptime.routes';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import dashboardRoutes from './routes/dashboard.routes';
import customServicesRoutes from './routes/custom-services.routes';
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

// Routes
app.use('/api/status', statusRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/uptime', uptimeRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/custom-services', customServicesRoutes);

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
  
  // Start cron jobs
  cronService.startAll();
  console.log(`\n⏰ Automated monitoring started`);
});

export default app;