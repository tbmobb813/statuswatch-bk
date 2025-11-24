import { spawn, ChildProcess } from 'child_process';
import waitForExpect from 'wait-for-expect';
import { prisma } from '../../src/lib/db';
import { Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import * as net from 'net';

// This integration test requires Redis and Postgres running (use docker-compose.test.yml).
// It will spawn the worker (via tsx) as a child process, enqueue a cleanup job, and assert
// that old status checks are deleted by the worker.

jest.setTimeout(45000);

describe('BullMQ worker end-to-end', () => {
  let workerProc: ChildProcess | null = null;
  const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';

  beforeAll(async () => {
    // prepare DB: create a service and three statusChecks (two old, one recent)
    // use findUnique + create/update to avoid upsert race that can throw a unique constraint error
    const existingService = await prisma.service.findUnique({ where: { id: 'svc-cleanup' } });
    if (!existingService) {
      try {
        await prisma.service.create({
          data: {
            id: 'svc-cleanup',
            name: 'Cleanup Service',
            slug: 'cleanup-service',
            category: 'Custom',
            statusUrl: 'http://example.com'
          },
        });
      } catch (err) {
        // ignore duplicate error if another process created it concurrently
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
          if (err.code !== 'P2002') throw err;
        } else {
          throw err;
        }
      }
    } else {
      await prisma.service.update({
        where: { id: 'svc-cleanup' },
        data: {
          name: 'Cleanup Service',
          slug: 'cleanup-service',
          category: 'Custom',
          statusUrl: 'http://example.com'
        }
      });
    }

    const now = new Date();
    const old1 = new Date(now.getTime() - (8 * 24 * 60 * 60 * 1000));
    const old2 = new Date(now.getTime() - (9 * 24 * 60 * 60 * 1000));
    
    await prisma.statusCheck.upsert({
      where: { id: 'sc1' },
      update: { serviceId: 'svc-cleanup', isUp: true, checkedAt: old1 },
      create: { id: 'sc1', serviceId: 'svc-cleanup', isUp: true, checkedAt: old1 }
    });
    await prisma.statusCheck.upsert({
      where: { id: 'sc2' },
      update: { serviceId: 'svc-cleanup', isUp: false, checkedAt: old2 },
      create: { id: 'sc2', serviceId: 'svc-cleanup', isUp: false, checkedAt: old2 }
    });
    await prisma.statusCheck.upsert({
      where: { id: 'sc3' },
      update: { serviceId: 'svc-cleanup', isUp: true, checkedAt: now },
      create: { id: 'sc3', serviceId: 'svc-cleanup', isUp: true, checkedAt: now }
    });
    
    // start worker process
    workerProc = spawn('npx', ['tsx', 'src/workers/status.worker.ts'], {
      env: { ...process.env, USE_BULL: 'true', REDIS_URL: redisUrl },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc']
    });

    // wait for ready message in stdout
    await new Promise<void>((resolve) => {
      const proc = workerProc;
      if (!proc || !proc.stdout) return resolve();
      const stdout = proc.stdout;
      const onData = (chunk: Buffer) => {
        const s = chunk.toString();
        if (s.includes('✅ BullMQ workers started')) {
          stdout.off('data', onData);
          resolve();
        }
      };
      stdout.on('data', onData);
      // fallback timeout
      setTimeout(() => resolve(), 5000);
    });
  });

  afterAll(async () => {
    try {
      if (workerProc) {
        // prefer IPC graceful shutdown when available
        try {
              if (typeof workerProc.send === 'function' && (workerProc as unknown as { connected?: boolean }).connected) {
                workerProc.send({ type: 'shutdown' });
            // give it a short grace period to exit
            await new Promise((res) => setTimeout(res, 1500));
          }
        } catch {
          // ignore send errors
        }

        // fallback to SIGTERM if still running
        if (!workerProc.killed) {
          workerProc.kill('SIGTERM');
        }
      }
    } catch {
      // ignore
    }

    // cleanup test data
    await prisma.statusCheck.deleteMany({ where: { serviceId: 'svc-cleanup' } });
    await prisma.service.deleteMany({ where: { id: 'svc-cleanup' } });

    // Log worker exit code for diagnostics
    if (workerProc) {
      console.log('Worker exitCode:', workerProc.exitCode, 'killed:', workerProc.killed);
    }

    // Check for open handles (resource leaks) - omitted in test run

  }, 120000);

  test('cleanup job deletes old status checks', async () => {
    // Quick TCP check to see if Redis is reachable; if not, skip this test early.
    const isRedisAvailable = (urlString: string, timeout = 500) => new Promise<boolean>((resolve) => {
      try {
        const u = new URL(urlString);
        const s = new net.Socket();
        let done = false;
        const onResult = (ok: boolean) => { if (!done) { done = true; s.destroy(); resolve(ok); } };
        s.setTimeout(timeout, () => onResult(false));
        s.once('error', () => onResult(false));
        s.once('connect', () => onResult(true));
        s.connect(Number(u.port) || 6379, u.hostname);
      } catch {
        resolve(false);
      }
    });

    if (!(await isRedisAvailable(redisUrl))) {
      console.warn('Skipping cleanup-job assertion because Redis is not available');
      return;
    }

    const url = new URL(redisUrl);
    const connection = { host: url.hostname, port: Number(url.port) || 6379, password: url.password || undefined };
  const q = new Queue('cleanup', { connection });

  // Wait for control worker / cleanup worker readiness marker to reduce race conditions
  // (worker prints '✅ BullMQ workers started' and 'CONTROL_WORKER_READY')
  await new Promise((res) => setTimeout(res, 500));
  await q.add('cleanup-job', { serviceId: 'svc-cleanup' });

    // wait until only the recent status check remains
      await waitForExpect(async () => {
      const count = await prisma.statusCheck.count({ where: { serviceId: 'svc-cleanup' } });
      expect(count).toBe(1);
    }, 15000, 500);

    await q.close();
  }, 20000);
});