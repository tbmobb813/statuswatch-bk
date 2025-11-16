import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  console.log('🔍 Testing database connection...');
  
  try {
    // Test database connection
    const services = await prisma.service.findMany();
    console.log(`✅ Found ${services.length} services in database`);
    
    if (services.length === 0) {
      console.log('⚠️  No services found. Run the seed script first!');
      console.log('   npx tsx prisma/seed.ts');
    } else {
      console.log('Services:', services.map(s => s.name).join(', '));
    }
    
  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();