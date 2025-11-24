import { NotificationService } from '../services/notification.service';
import { StatusService } from '../services/status.service';
import { prisma } from '../lib/db';
import type { Job } from 'bullmq';

async function startWorker() {
  let shuttingDown = false;
  let worker: unknown = null;
  let worker2: unknown = null;
  let worker3: unknown = null;

  const notificationService = new NotificationService();
  const statusService = new StatusService();

  try {
    const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
    const url = new URL(redisUrl);
    const connection = { host: url.hostname, port: Number(url.port) || 6379, password: url.password || undefined };

    const processor = async (job: Job) => {
      try {
        console.log('[Worker] processing job:', job.name);
        if (job.name === 'status-check-job') {
          const statuses = await statusService.checkAllServices();
          console.log(`[Worker] checked ${statuses.length} services`);
          for (const currentStatus of statuses) {
            try {
              const service = await prisma.service.findUnique({ where: { slug: currentStatus.slug }, include: { statusChecks: { orderBy: { checkedAt: 'desc' }, take: 2 } } });
              if (!service || !service.statusChecks || service.statusChecks.length < 2) continue;
              const processorModule = await import('../services/status-change.processor');
              await processorModule.processStatusChange(service, currentStatus, { notificationService, prismaClient: prisma });
            } catch (err) {
              console.error('[Worker] error handling status change for service:', err);
            }
          }
        }
        if (job.name === 'incident-check-job') {
          try {
            const unresolvedIncidents = await prisma.incident.findMany({ where: { status: { not: 'resolved' } }, include: { service: true } });
            console.log(`[Worker] found ${unresolvedIncidents.length} unresolved incidents`);
          } catch (err) {
            console.error('[Worker] failed to fetch unresolved incidents:', err);
          }
        }
        if (job.name === 'cleanup-job') {
          try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const serviceId = (job.data as unknown as { serviceId?: string })?.serviceId;
            const where: Record<string, unknown> = { checkedAt: { lt: sevenDaysAgo } };
            if (serviceId) where.serviceId = serviceId;
            const deleted = await prisma.statusCheck.deleteMany({ where });
            console.log(`[Worker] deleted ${deleted.count} old status checks`);
          } catch (err) {
            console.error('[Worker] cleanup failed:', err);
          }
        }
      } catch (err) {
        console.error('[Worker] job processor error:', err);
      }
    };

    const bullmq = await import('bullmq');
    const Worker = bullmq.Worker;

    worker = new Worker('status-check', processor, { connection });
    worker2 = new Worker('incident-check', processor, { connection });
    worker3 = new Worker('cleanup', processor, { connection });

    // control worker: listens for 'shutdown' control job so tests can signal via Redis
    const controlProcessor = async (job: Job) => {
      try {
        console.log('[Worker] control job received:', job.name, job.data);
        if (job.name === 'shutdown') {
          console.log('[Worker] control: shutdown requested');
          await shutdown('control');
        }
      } catch (err) {
        console.error('[Worker] control job error:', err);
      }
    };
    const controlWorker = new Worker('control', controlProcessor, { connection });
    controlWorker.on('error', (err: Error) => console.error('[Worker:control] error', err));

  // signal that control worker is ready so test harnesses can enqueue control jobs reliably
  console.log('CONTROL_WORKER_READY');

    worker.on('completed', (job: Job) => console.log(`[Worker:status-check] completed job ${job.id} (${job.name})`));
    worker.on('failed', (job: Job | undefined, err: Error) => console.error(`[Worker:status-check] job failed ${job?.id} (${job?.name}):`, err));
    worker.on('error', (err: Error) => console.error('[Worker:status-check] error', err));

    worker2.on('completed', (job: Job) => console.log(`[Worker:incident-check] completed job ${job.id} (${job.name})`));
    worker2.on('failed', (job: Job | undefined, err: Error) => console.error(`[Worker:incident-check] job failed ${job?.id} (${job?.name}):`, err));
    worker2.on('error', (err: Error) => console.error('[Worker:incident-check] error', err));

    worker3.on('completed', (job: Job) => console.log(`[Worker:cleanup] completed job ${job.id} (${job.name})`));
    worker3.on('failed', (job: Job | undefined, err: Error) => console.error(`[Worker:cleanup] job failed ${job?.id} (${job?.name}):`, err));
    worker3.on('error', (err: Error) => console.error('[Worker:cleanup] error', err));

    console.log('✅ BullMQ workers started for status-check, incident-check and cleanup');

    const closeWithTimeout = async (w: unknown, name: string, timeoutMs = 2000) => {
      if (!w) return;
      let finished = false;
      const finish = () => { finished = true; };
      const closable = w as { close?: () => Promise<void> };
      const p = (closable.close ? closable.close() : Promise.resolve()).then(finish).catch((e: unknown) => { console.error(`[Worker:${name}] close error`, e); finish(); });
      const t = new Promise<void>((resolve) => setTimeout(() => { if (!finished) { console.warn(`[Worker:${name}] close timed out after ${timeoutMs}ms`); } resolve(); }, timeoutMs));
      await Promise.race([p, t]);
    };

    const closeWorkers = async () => {
      await Promise.all([
        closeWithTimeout(worker, 'status-check', 2000),
        closeWithTimeout(worker2, 'incident-check', 2000),
        closeWithTimeout(worker3, 'cleanup', 2000),
      ]);
    };

    const shutdown = async (reason?: string) => {
      if (shuttingDown) {
        console.log('[Worker] shutdown already in progress');
        return;
      }
      shuttingDown = true;
      console.log('[Worker] shutdown initiated', reason ?? '');
      try {
        await closeWorkers();
        console.log('[Worker] workers closed');
      } catch (err) {
        console.error('[Worker] error closing workers', err);
      }

      // Disconnect Prisma to close DB pool and allow process to exit in tests
      try {
        if (prisma && typeof (prisma as unknown as { $disconnect?: (...args: unknown[]) => Promise<void> }).$disconnect === 'function') {
          await (prisma as unknown as { $disconnect: () => Promise<void> }).$disconnect();
          console.log('[Worker] prisma disconnected');
        }
      } catch (err) {
        console.warn('[Worker] error disconnecting prisma:', err);
      }

      // Disconnect IPC (if any) so parent sees connected==false
      try {
        const p = process as unknown as { disconnect?: () => void };
        if (typeof p.disconnect === 'function') {
          console.log('[Worker] disconnecting IPC');
          p.disconnect();
        }
      } catch (err) {
        console.warn('[Worker] error disconnecting IPC', err);
      }

      // Announce shutdown completion for test harnesses
      try { console.log('SHUTDOWN_COMPLETE'); } catch {}

      // give Node a short moment to naturally exit, then force
      setTimeout(() => { try { process.exit(0); } catch {} }, 300);
      setTimeout(() => { console.warn('[Worker] forcing exit after shutdown'); try { process.exit(1); } catch {} }, 5000);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('message', (msg: unknown) => {
      try {
        console.log('[Worker] IPC message', msg);
        const m = msg as { type?: string } | string | null | undefined;
        if (m === 'shutdown' || (typeof m === 'object' && m?.type === 'shutdown')) {
          void shutdown('ipc');
        }
      } catch (err) {
        console.error('[Worker] IPC handler error', err);
      }
    });

    process.on('exit', (code) => console.log('[Worker] process exit', code));

  } catch (err) {
    console.warn('BullMQ/ioredis not available or failed to start worker. Skipping worker start.', err);
  }
}

startWorker().catch((err) => console.error('Failed to start worker:', err));

