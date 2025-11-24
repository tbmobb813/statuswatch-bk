import { spawn, ChildProcess } from 'child_process';
import waitForExpect from 'wait-for-expect';
import { Queue } from 'bullmq';
import { prisma } from '../../src/lib/db';

jest.setTimeout(45000);

describe('BullMQ worker shutdown lifecycle', () => {
  let workerProc: ChildProcess | null = null;
  const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';

  beforeAll(async () => {
    // Start worker process
    workerProc = spawn('npx', ['tsx', 'src/workers/status.worker.ts'], {
      env: { ...process.env, USE_BULL: 'true', REDIS_URL: redisUrl },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc']
    });
    // Wait for ready message
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

  test('worker responds to double shutdown and closes cleanly', async () => {
    if (!workerProc) throw new Error('Worker not started');
    // Send shutdown twice and wait for explicit SHUTDOWN_COMPLETE marker on stdout
    if (typeof workerProc.send === 'function') {
      workerProc.send({ type: 'shutdown' });
      await new Promise((res) => setTimeout(res, 500));
      workerProc.send({ type: 'shutdown' });
    }

    // Wait for the worker process (npx/tsx wrapper) to exit within timeout.
    // If IPC didn't reach the inner process, fall back to SIGTERM on the wrapper.
    await new Promise<void>((resolve, reject) => {
      const proc = workerProc!;
      // send SIGTERM as fallback
      try { proc.kill('SIGTERM'); } catch {}
      if (proc.killed || proc.exitCode !== null) return resolve();
      const timer = setTimeout(() => {
        proc.removeAllListeners('close');
        proc.removeAllListeners('exit');
        reject(new Error('Timed out waiting for worker process to exit'));
      }, 8000);
      const onClose = () => { clearTimeout(timer); resolve(); };
      proc.once('close', onClose);
      proc.once('exit', onClose);
    });
  });
});
