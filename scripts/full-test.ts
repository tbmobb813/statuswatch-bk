import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

async function fullTest() {
  console.log('🚀 StatusWatch - Full System Test\n');
  console.log('='.repeat(50));
  
  // Test 1: Database Connection
  console.log('\n📊 Test 1: Database Connection');
  try {
    const count = await prisma.service.count();
    console.log(`✅ Connected! Found ${count} services`);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return;
  }
  
  // Test 2: Fetch GitHub Status
  console.log('\n🐙 Test 2: GitHub Status API');
  try {
    const response = await axios.get('https://www.githubstatus.com/api/v2/status.json');
    const status = response.data.status.indicator;
    console.log(`✅ GitHub Status: ${status}`);
  } catch (error) {
    console.error('❌ GitHub API failed:', error);
  }
  
  // Test 3: Check if services are seeded
  console.log('\n🌱 Test 3: Check Seeded Services');
  const services = await prisma.service.findMany();
  
  if (services.length === 0) {
    console.log('⚠️  No services found. Let me seed them now...');
    
    const servicesToSeed = [
      {
        name: 'GitHub',
        slug: 'github',
        category: 'Version Control',
        statusUrl: 'https://www.githubstatus.com',
        color: '#24292e'
      },
      {
        name: 'AWS',
        slug: 'aws',
        category: 'Cloud Provider',
        statusUrl: 'https://status.aws.amazon.com',
        color: '#FF9900'
      },
      {
        name: 'Vercel',
        slug: 'vercel',
        category: 'Hosting',
        statusUrl: 'https://www.vercel-status.com',
        color: '#000000'
      }
    ];
    
    for (const service of servicesToSeed) {
      await prisma.service.create({ data: service });
      console.log(`   ✅ Created: ${service.name}`);
    }
  } else {
    console.log('✅ Services found:');
    services.forEach(s => console.log(`   - ${s.name} (${s.slug})`));
  }
  
  // Test 4: Create a test status check
  console.log('\n💾 Test 4: Create Status Check');
  const githubService = await prisma.service.findUnique({
    where: { slug: 'github' }
  });
  
  if (githubService) {
    await prisma.statusCheck.create({
      data: {
        serviceId: githubService.id,
        isUp: true,
        responseTime: 150,
        statusCode: 200
      }
    });
    console.log('✅ Created test status check for GitHub');
  }
  
  // Test 5: Query status checks
  console.log('\n📈 Test 5: Recent Status Checks');
  const recentChecks = await prisma.statusCheck.findMany({
    take: 5,
    orderBy: { checkedAt: 'desc' },
    include: { service: true }
  });
  
  console.log(`✅ Found ${recentChecks.length} recent checks`);
  recentChecks.forEach(check => {
    console.log(`   - ${check.service.name}: ${check.isUp ? '✅ UP' : '❌ DOWN'} at ${check.checkedAt.toLocaleString()}`);
  });
  
  console.log('\n' + '='.repeat(50));
  console.log('🎉 All tests complete!\n');
  
  await prisma.$disconnect();
}

fullTest().catch(console.error);