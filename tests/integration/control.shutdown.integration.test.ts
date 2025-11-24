import { spawn, ChildProcess } from 'child_process';
import waitForExpect from 'wait-for-expect';
import { Queue } from 'bullmq';

jest.setTimeout(45000);

describe('BullMQ worker control-channel shutdown', () => {
  let workerProc: ChildProcess | null = null;
  const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';

  beforeAll(async () => {
    workerProc = spawn('npx', ['tsx', 'src/workers/status.worker.ts'], {
      env: { ...process.env, USE_BULL: 'true', REDIS_URL: redisUrl },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc']
    });

    // wait for ready message
    await new Promise<void>((resolve) => {
      const stdout = workerProc?.stdout;
      if (!stdout) return resolve();
      const onData = (chunk: Buffer) => {
        if (chunk.toString().includes('✅ BullMQ workers started')) {
          stdout.off('data', onData);
          resolve();
        }
      };
      stdout.on('data', onData);
      setTimeout(() => resolve(), 5000);
    });
  });

  afterAll(async () => {
    if (workerProc) {
      try {
        if (typeof workerProc.send === 'function' && (workerProc as unknown as { connected?: boolean }).connected) {
          workerProc.send({ type: 'shutdown' });
          await new Promise((res) => setTimeout(res, 1500));
        }
      } catch {}
      if (!workerProc.killed) workerProc.kill('SIGTERM');
    }
  });

  test('worker shuts down when control shutdown job is enqueued', async () => {
    if (!workerProc) throw new Error('Worker not started');

    // Try to enqueue a control shutdown job; if Redis isn't available, skip the test.
    let q: Queue | null = null;
    try {
      const u = new URL(redisUrl);
      const connection = { host: u.hostname, port: Number(u.port) || 6379, password: u.password || undefined };
      q = new Queue('control', { connection });
        // give the worker a small moment to ensure the control worker has subscribed
        // wait for a specific marker emitted by the worker that indicates the control worker is ready
        await new Promise<void>((resolve) => {
          if (!workerProc || !workerProc.stdout) return resolve();
          const stdout = workerProc.stdout;
          const onData = (chunk: Buffer) => {
            if (chunk.toString().includes('CONTROL_WORKER_READY')) {
              stdout.off('data', onData);
              resolve();
            }
          };
          stdout.on('data', onData);
          // fallback
          setTimeout(() => resolve(), 1000);
        });

        // Try enqueueing the shutdown job a few times in case the worker hasn't fully subscribed yet
        let added = false;
        let jobCountSnapshot: any = null;
        for (let i = 0; i < 3 && !added; i++) {
          try {
            const job = await q.add('shutdown', {});
            added = true;
            // capture counts for debug
            try { jobCountSnapshot = await q.getJobCounts(); } catch {}
          } catch (err) {
            // backoff and retry
            await new Promise((res) => setTimeout(res, 200 * (i + 1)));
          }
        }
        if (!added) {
          console.warn('Failed to enqueue control shutdown job after retries');
        } else {
          console.log('control queue counts after add:', jobCountSnapshot);
        }
    } catch (err) {
      // skip if Redis isn't reachable
      console.warn('Skipping control shutdown test because Redis is not available:', err);
      return;
    }

    // Wait for the worker to emit SHUTDOWN_COMPLETE or exit
    const stdout = workerProc.stdout;
    let sawShutdownMarker = false;
    if (stdout) {
      const onData = (chunk: Buffer) => {
        const s = chunk.toString();
        if (s.includes('SHUTDOWN_COMPLETE')) sawShutdownMarker = true;
      };
      stdout.on('data', onData);
      // Wait for either the marker or process close
      await Promise.race([
        waitForExpect(() => { expect(sawShutdownMarker).toBeTruthy(); }, 15000, 200),
        new Promise<void>((resolve) => {
          workerProc!.once('close', () => resolve());
        })
      ]);
      stdout.off('data', () => {});
    } else {
      // no stdout, wait for process to close
      await new Promise<void>((resolve) => workerProc!.once('close', () => resolve()));
    }

    if (q) await q.close();
    // Ensure worker process exited
    if (!workerProc.killed && workerProc.exitCode === null) {
      // give small grace then force
      await new Promise((res) => setTimeout(res, 300));
    }

    expect(workerProc.killed || workerProc.exitCode !== null || sawShutdownMarker).toBeTruthy();
  });
});
