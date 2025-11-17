import express from 'express';
import cors from 'cors';
import statusRoutes from './routes/status.routes';
import incidentRoutes from './routes/incidents.routes';
import uptimeRoutes from './routes/uptime.routes';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import { CronService } from './services/cron.service';

const app = express();
const PORT = process.env.PORT || 5555;
const cronService = new CronService();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/status', statusRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/uptime', uptimeRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
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