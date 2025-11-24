import { CronService } from '../src/services/cron.service';

async function main() {
  // Ensure USE_BULL is true for this run
  process.env.USE_BULL = 'true';
  process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';

  const c = new CronService();
  // Only register repeatables (these methods now enqueue repeatables when USE_BULL=true)
  c.startStatusMonitoring();
  c.startIncidentMonitoring();
  c.startCleanupTask();

  // give a short delay to let queues register
  await new Promise((r) => setTimeout(r, 1500));
  console.log('Done attempting to register repeatable jobs');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
