import IORedis from 'ioredis';

async function main(){
  const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
  const client = new IORedis(redisUrl);
  const keys = await client.keys('*');
  console.log('Redis keys count:', keys.length);
  console.log(keys.slice(0,200).join('\n'));
  await client.quit();
}

main().catch(err => { console.error(err); process.exit(1); });
