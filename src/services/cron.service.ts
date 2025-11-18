import cron from 'node-cron';
import { StatusService, ServiceStatus } from './status.service';
import { NotificationService } from './notification.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const statusService = new StatusService();
const notificationService = new NotificationService();

export class CronService {
  private tasks: cron.ScheduledTask[] = [];
  private retryAttempts: number = Number(process.env.DB_RETRY_ATTEMPTS ?? process.env.RETRY_ATTEMPTS ?? 5);
  private retryDelayMs: number = Number(process.env.DB_RETRY_DELAY_MS ?? process.env.RETRY_DELAY_MS ?? 300);

  // Simple retry helper with exponential backoff (copied locally to avoid cross-service coupling)
  private async retry<T>(fn: () => Promise<T>, attempts = 3, initialDelayMs = 300): Promise<T> {
    let lastErr: unknown;
    let delay = initialDelayMs;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        if (i < attempts - 1) {
          await new Promise((res) => setTimeout(res, delay));
          delay *= 2;
        }
      }
    }
    throw lastErr;
  }

  // Check all services every 2 minutes
  startStatusMonitoring() {
    const task = cron.schedule('*/2 * * * *', async () => {
      console.log('🔍 Running scheduled status checks...');
      try {
        const statuses = await statusService.checkAllServices();
        console.log(`✅ Checked ${statuses.length} services`);
        
        // Check for status changes and trigger alerts
        for (const status of statuses) {
          await this.checkForStatusChange(status);
        }
      } catch (error) {
        console.error('❌ Error in scheduled status check:', error);
      }
    });

    this.tasks.push(task);
    console.log('✅ Status monitoring cron job started (every 2 minutes)');
  }

  // Check every 5 minutes for unresolved incidents
  startIncidentMonitoring() {
    const task = cron.schedule('*/5 * * * *', async () => {
      console.log('🔍 Checking for unresolved incidents...');
      try {
        try {
          const unresolvedIncidents = await this.retry(() => prisma.incident.findMany({
            where: {
              status: {
                not: 'resolved'
              }
            },
            include: {
              service: true
            }
          }));

          console.log(`Found ${unresolvedIncidents.length} unresolved incidents`);
        } catch (err) {
          console.error('Failed to fetch unresolved incidents after retries:', err);
        }
      } catch (error) {
        console.error('❌ Error checking incidents:', error);
      }
    });

    this.tasks.push(task);
    console.log('✅ Incident monitoring cron job started (every 5 minutes)');
  }

  // Clean up old status checks (keep last 7 days)
  startCleanupTask() {
    // Run daily at 2 AM
    const task = cron.schedule('0 2 * * *', async () => {
      console.log('🧹 Running cleanup task...');
      try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        try {
          const deleted = await this.retry(() => prisma.statusCheck.deleteMany({
            where: {
              checkedAt: {
                lt: sevenDaysAgo
              }
            }
          }));

          console.log(`✅ Deleted ${deleted.count} old status checks`);
        } catch (err) {
          console.error('Failed cleanup deleteMany after retries:', err);
        }
      } catch (error) {
        console.error('❌ Error in cleanup task:', error);
      }
    });

    this.tasks.push(task);
    console.log('✅ Cleanup cron job started (daily at 2 AM)');
  }

  private async checkForStatusChange(currentStatus: ServiceStatus) {
    try {
      const service = await this.retry(() => prisma.service.findUnique({
        where: { slug: currentStatus.slug },
        include: {
          statusChecks: {
            orderBy: { checkedAt: 'desc' },
            take: 2
          }
        }
      }));

      if (!service || service.statusChecks.length < 2) {
        return;
      }

      const [current, previous] = service.statusChecks;

      // Compare by isUp boolean (Prisma StatusCheck uses isUp)
      if (current.isUp !== previous.isUp) {
        const prevStatus = previous.isUp ? 'operational' : 'outage';
        const currStatus = current.isUp ? 'operational' : 'outage';
        console.log(`⚠️  Status change detected for ${service.name}: ${prevStatus} → ${currStatus}`);

        // Send notifications to users
        await notificationService.notifyStatusChange(
          service.id,
          prevStatus,
          currStatus,
          currentStatus.message
        );

        // Create incident if status degraded
        if (!current.isUp && previous.isUp) {
          await this.createIncident(service.id, currStatus, currentStatus.message);
        }

        // Resolve incident if service recovered
        if (current.isUp && !previous.isUp) {
          await this.resolveIncidents(service.id);
        }
      }
    } catch (error) {
      console.error('Error checking status change:', error);
    }
  }

  private async createIncident(serviceId: string, status: string, message?: string | null) {
    const impact = this.determineImpact(status);
    try {
      await this.retry(() => prisma.incident.create({
        data: {
          serviceId,
          title: `Service ${status.replace('_', ' ')}`,
          description: message || undefined,
          status: 'investigating',
          severity: impact === 'critical' ? 'critical' : impact === 'major' ? 'major' : 'minor',
          startedAt: new Date(),
          impact
        }
      }));

      console.log(`📝 Created new incident for service ${serviceId}`);
    } catch (err) {
      console.error('Failed to create incident after retries:', err);
    }
  }

  private async resolveIncidents(serviceId: string) {
    try {
      await this.retry(() => prisma.incident.updateMany({
        where: {
          serviceId,
          status: {
            not: 'resolved'
          }
        },
        data: {
          status: 'resolved',
          resolvedAt: new Date()
        }
      }));

      console.log(`✅ Resolved incidents for service ${serviceId}`);
    } catch (err) {
      console.error('Failed to resolve incidents after retries:', err);
    }
  }

  private determineImpact(status: string): string {
    switch (status) {
      case 'major_outage':
        return 'critical';
      case 'partial_outage':
        return 'major';
      case 'degraded':
        return 'minor';
      default:
        return 'none';
    }
  }

  startAll() {
    this.startStatusMonitoring();
    this.startIncidentMonitoring();
    this.startCleanupTask();
  }

  stopAll() {
    this.tasks.forEach(task => task.stop());
    console.log('🛑 All cron jobs stopped');
  }
}