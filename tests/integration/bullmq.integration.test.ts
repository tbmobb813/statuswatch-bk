import { spawn } from 'child_process';
import { promisify } from 'util';
import waitForExpect from 'wait-for-expect';
import { prisma } from '../../src/lib/db';
import { Queue } from 'bullmq';

// This integration test requires Redis and Postgres running (use docker-compose.test.yml).
// It will spawn the worker (via tsx) as a child process, enqueue a cleanup job, and assert
// that old status checks are deleted by the worker.

jest.setTimeout(45000);

describe('BullMQ worker end-to-end', () => {
  let workerProc: any = null;
  const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';

  beforeAll(async () => {
    // prepare DB: create a service and three statusChecks (two old, one recent)
    await prisma.service.upsert({
      where: { id: 'svc-cleanup' },
      update: {},
      create: {
        id: 'svc-cleanup',
        name: 'Cleanup Service',
        slug: 'cleanup-service',
        category: 'Custom',
        statusUrl: 'http://example.com'
      }
    });

    const now = new Date();
    const old1 = new Date(now.getTime() - (8 * 24 * 60 * 60 * 1000));
    const old2 = new Date(now.getTime() - (9 * 24 * 60 * 60 * 1000));

    await prisma.statusCheck.create({ data: { id: 'sc1', serviceId: 'svc-cleanup', isUp: true, checkedAt: old1 } });
    await prisma.statusCheck.create({ data: { id: 'sc2', serviceId: 'svc-cleanup', isUp: false, checkedAt: old2 } });
    await prisma.statusCheck.create({ data: { id: 'sc3', serviceId: 'svc-cleanup', isUp: true, checkedAt: now } });

    // start worker process
    workerProc = spawn('npx', ['tsx', 'src/workers/status.worker.ts'], {
      env: { ...process.env, USE_BULL: 'true', REDIS_URL: redisUrl },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc']
    });

    // wait for ready message in stdout
    await new Promise<void>((resolve) => {
      if (!workerProc.stdout) return resolve();
      const onData = (chunk: Buffer) => {
        const s = chunk.toString();
        if (s.includes('✅ BullMQ workers started')) {
          workerProc.stdout?.off('data', onData);
          resolve();
        }
      };
      workerProc.stdout.on('data', onData);
      // fallback timeout
      setTimeout(() => resolve(), 5000);
    });
  });

  afterAll(async () => {
    try {
      if (workerProc) {
        // prefer IPC graceful shutdown when available
        try {
          if (typeof workerProc.send === 'function') {
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
  });

  test('cleanup-job removed old status checks', async () => {
    const initial = await prisma.statusCheck.findMany({ where: { serviceId: 'svc-cleanup' } });
    expect(initial.length).toBeGreaterThanOrEqual(3);

    // enqueue cleanup job to 'cleanup' queue
    const q = new Queue('cleanup', { connection: { host: new URL(redisUrl).hostname, port: Number(new URL(redisUrl).port) || 6379 } });
  await q.add('cleanup-job', { serviceId: 'svc-cleanup' });

    // wait for worker to process and delete old records (poll with wait-for-expect)
    await waitForExpect(async () => {
      const remaining = await prisma.statusCheck.findMany({ where: { serviceId: 'svc-cleanup' } });
      // Only the recent one should remain
      expect(remaining.length).toBe(1);
    }, 20000, 1000);

    await q.close();
  });
});
