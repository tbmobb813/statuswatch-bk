const { PrismaClient } = require('@prisma/client');

(async () => {
  const db = new PrismaClient();
  try {
    const cols = await db.$queryRaw`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='services' ORDER BY ordinal_position`;
    console.log(JSON.stringify(cols, null, 2));
  } catch (e) {
    console.error('Error querying columns:', e);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
})();
