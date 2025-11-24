import { StatusService } from '../services/status.service';
import { NotificationService } from '../services/notification.service';
import { prisma } from '../lib/db';

// Lightweight worker using BullMQ to process queued cron tasks.
// This file attempts to import bullmq and ioredis dynamically so the project
// still runs if dependencies are not installed.

const statusService = new StatusService();
const notificationService = new NotificationService();

async function startWorker() {
  try {
    const { Worker } = await import('bullmq');
    const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
    const url = new URL(redisUrl);
    const connection = { host: url.hostname, port: Number(url.port) || 6379, password: url.password || undefined };

    const processor = async (job: any) => {
      try {
        console.log('Worker processing job:', job.name);

        if (job.name === 'status-check-job') {
          const statuses = await statusService.checkAllServices();
          console.log(`Worker: checked ${statuses.length} services`);

          for (const currentStatus of statuses) {
            try {
              const service = await prisma.service.findUnique({
                where: { slug: currentStatus.slug },
                include: {
                  statusChecks: {
                    orderBy: { checkedAt: 'desc' },
                    take: 2
                  }
                }
              });

              if (!service || !service.statusChecks || service.statusChecks.length < 2) continue;

              // Delegate to shared processor
              const { default: processStatusChange } = await import('../services/status-change.processor');
              await processStatusChange(service as { id: string; name: string; statusChecks: Array<{ isUp: boolean; checkedAt: Date }> }, currentStatus as { slug: string; message?: string | null }, { notificationService, prismaClient: prisma });
            } catch (err) {
              console.error('Worker: error handling status change for service:', err);
            }
          }
        }

        if (job.name === 'incident-check-job') {
          try {
            const unresolvedIncidents = await prisma.incident.findMany({
              where: { status: { not: 'resolved' } },
              include: { service: true }
            });
            console.log(`Worker: found ${unresolvedIncidents.length} unresolved incidents`);
          } catch (err) {
            console.error('Worker: failed to fetch unresolved incidents:', err);
          }
        }

        if (job.name === 'cleanup-job') {
          try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            // Allow cleanup to be scoped to a specific service when job.data.serviceId is provided.
            // This keeps integration tests deterministic when the DB contains other older rows.
            const serviceId = job.data && (job.data as { serviceId?: string }).serviceId;
            const whereClause: Record<string, unknown> = { checkedAt: { lt: sevenDaysAgo } };
            if (serviceId) whereClause.serviceId = serviceId;

            const deleted = await prisma.statusCheck.deleteMany({ where: whereClause });
            console.log(`Worker: deleted ${deleted.count} old status checks${serviceId ? ` for service=${serviceId}` : ''}`);
          } catch (err) {
            console.error('Worker: cleanup failed:', err);
          }
        }

      } catch (err) {
        console.error('Worker: job processor error:', err);
      }
    };

  const worker = new Worker('status-check', processor, { connection });
  const worker2 = new Worker('incident-check', processor, { connection });
  const worker3 = new Worker('cleanup', processor, { connection });

    worker.on('completed', (job) => console.log(`Worker: completed job ${job.id} (${job.name})`));
    worker.on('failed', (job, err) => console.error(`Worker: job failed ${job?.id} (${job?.name}):`, err));

    worker2.on('completed', (job) => console.log(`Worker2: completed job ${job.id} (${job.name})`));
    worker2.on('failed', (job, err) => console.error(`Worker2: job failed ${job?.id} (${job?.name}):`, err));

    worker3.on('completed', (job) => console.log(`Worker3: completed job ${job.id} (${job.name})`));
    worker3.on('failed', (job, err) => console.error(`Worker3: job failed ${job?.id} (${job?.name}):`, err));

    console.log('✅ BullMQ workers started for status-check, incident-check and cleanup');

    // handle graceful shutdown
    let shuttingDown = false;
    const shutdown = async (reason?: string) => {
      if (shuttingDown) return;
      shuttingDown = true;
      console.log('Shutting down BullMQ workers...', reason ? `reason=${reason}` : '');
      try {
        await Promise.all([worker.close(), worker2.close(), worker3.close()]);
        console.log('BullMQ workers closed');
      } catch (err) {
        console.error('Error closing BullMQ workers during shutdown:', err);
      }
      // allow test harness or process manager to decide exit code; but exit here for standalone run
      try {
        process.exit(0);
      } catch {}
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    // support IPC-based shutdown for test harnesses (worker spawned with stdio:'ipc')
    process.on('message', (msg: unknown) => {
      try {
        if (!msg) return;
        const m = msg as { type?: string } | string;
        if (m === 'shutdown') {
          shutdown('ipc');
        } else if (typeof m === 'object') {
          const obj = m as { type?: unknown };
          if (obj.type === 'shutdown') shutdown('ipc');
        }
      } catch (err) {
        console.error('Error handling IPC message in worker:', err);
      }
    });

  } catch {
    console.warn('BullMQ/ioredis not available or failed to start worker. Skipping worker start.');
  }
}

startWorker().catch(err => console.error('Failed to start worker:', err));
