import cron, { ScheduledTask } from 'node-cron';
import { StatusService, ServiceStatus } from './status.service';
// notification service is used by the shared processor; import not required here
import { prisma } from '../lib/db';
const statusService = new StatusService();
// NotificationService is used by the shared processor; don't instantiate here to avoid unused variable lint

// When USE_BULL=true we will enqueue repeatable jobs into BullMQ instead of running in-process cron.
// Use dynamic imports so projects without bullmq/ioredis installed still run the normal cron path.
const USE_BULL = process.env.USE_BULL === 'true' || process.env.USE_QUEUE === 'true';

async function getQueue(name: string) {
  try {
    const { Queue } = await import('bullmq');
    const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
    // parse redis url into host/port/password for compatibility
    const url = new URL(redisUrl);
    const connection = {
      host: url.hostname,
      port: Number(url.port) || 6379,
      password: url.password || undefined
    };
    return new Queue(name, { connection });
  } catch {
    // bullmq not available — caller should fall back to cron
    return null;
  }
}

async function ensureRepeatable(queue: unknown, jobName: string, cronExpr: string, opts?: { jobId?: string }) {
  type Repeatable = { name?: string; cron?: string };
  type QueueLike = {
    getRepeatableJobs?: (start: number, end: number) => Promise<Repeatable[]>;
    add: (name: string, data: unknown, opts?: unknown) => Promise<unknown>;
  };

  try {
    const q = queue as QueueLike;
    // If bullmq provides getRepeatableJobs, check existing entries to avoid duplicates
    if (typeof q.getRepeatableJobs === 'function') {
      const repeatables = await q.getRepeatableJobs(0, 1000);
      const exists = repeatables.some((r: Repeatable) => r.name === jobName && r.cron === cronExpr);
      if (!exists) {
        await q.add(jobName, {}, { repeat: { cron: cronExpr }, jobId: opts?.jobId ?? `${jobName}-${cronExpr}` });
        console.log(`🔁 Registered repeatable job ${jobName} (${cronExpr})`);
      } else {
        console.log(`ℹ️ Repeatable job ${jobName} (${cronExpr}) already registered`);
      }
    } else {
      // Fallback: try to add anyway
      await q.add(jobName, {}, { repeat: { cron: cronExpr }, jobId: opts?.jobId ?? `${jobName}-${cronExpr}` });
      console.log(`🔁 Registered repeatable job ${jobName} (${cronExpr}) (no getRepeatableJobs available)`);
    }
  } catch (err) {
    console.error('Failed to ensure repeatable job in queue:', err);
  }
}

export class CronService {
  private tasks: ScheduledTask[] = [];
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
    // If BullMQ is enabled, enqueue a repeatable job instead of scheduling in-process
    if (USE_BULL) {
      getQueue('status-check').then(queue => {
        if (!queue) {
          console.warn('bullmq/ioredis not available — falling back to node-cron for status monitoring');
          this.startStatusMonitoring();
          return;
        }

        // Add a repeatable job using cron expression
        ensureRepeatable(queue, 'status-check-job', '*/2 * * * *').catch(err => {
          console.error('Failed to add repeatable status-check job to queue:', err);
        });

        console.log('✅ Status monitoring enqueued to BullMQ (every 2 minutes)');
      }).catch(err => {
        console.error('Error initializing BullMQ queue for status monitoring:', err);
      });
      return;
    }

    // Default in-process cron behavior
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
    if (USE_BULL) {
      getQueue('incident-check').then(queue => {
        if (!queue) {
          console.warn('bullmq/ioredis not available — falling back to node-cron for incident monitoring');
          this.startIncidentMonitoring();
          return;
        }

        ensureRepeatable(queue, 'incident-check-job', '*/5 * * * *').catch(err => {
          console.error('Failed to add repeatable incident-check job to queue:', err);
        });

        console.log('✅ Incident monitoring enqueued to BullMQ (every 5 minutes)');
      }).catch(err => {
        console.error('Error initializing BullMQ queue for incident monitoring:', err);
      });
      return;
    }

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
    if (USE_BULL) {
      getQueue('cleanup').then(queue => {
        if (!queue) {
          console.warn('bullmq/ioredis not available — falling back to node-cron for cleanup task');
          this.startCleanupTask();
          return;
        }

        ensureRepeatable(queue, 'cleanup-job', '0 2 * * *').catch(err => {
          console.error('Failed to add repeatable cleanup job to queue:', err);
        });

        console.log('✅ Cleanup task enqueued to BullMQ (daily at 2 AM)');
      }).catch(err => {
        console.error('Error initializing BullMQ queue for cleanup task:', err);
      });
      return;
    }

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

      // Delegate processing to shared processor for consistency and testability
  const { default: processStatusChange } = await import('./status-change.processor');
  await processStatusChange(service as { id: string; name: string; statusChecks: Array<{ isUp: boolean; checkedAt: Date }> }, currentStatus as ServiceStatus);
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