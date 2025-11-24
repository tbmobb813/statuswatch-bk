import { Queue } from 'bullmq';

async function main() {
  const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
  const url = new URL(redisUrl);
  const connection = { host: url.hostname, port: Number(url.port) || 6379, password: url.password || undefined };
  const q = new Queue('status-check', { connection });
  console.log('Adding a one-off status-check-job to status-check queue...');
  await q.add('status-check-job-manual', { now: true });
  console.log('Enqueued manual job');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
