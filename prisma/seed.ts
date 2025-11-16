import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create initial services
  const services = [
    {
      name: 'GitHub',
      slug: 'github',
      category: 'Version Control',
      statusUrl: 'https://www.githubstatus.com',
      logoUrl: 'https://github.githubassets.com/assets/GitHub-Mark-ea2971cee799.png',
      color: '#24292e'
    },
    {
      name: 'AWS',
      slug: 'aws',
      category: 'Cloud Provider',
      statusUrl: 'https://status.aws.amazon.com',
      logoUrl: 'https://a0.awsstatic.com/libra-css/images/logos/aws_logo_smile_1200x630.png',
      color: '#FF9900'
    },
    {
      name: 'Vercel',
      slug: 'vercel',
      category: 'Hosting',
      statusUrl: 'https://www.vercel-status.com',
      color: '#000000'
    },
    {
      name: 'Stripe',
      slug: 'stripe',
      category: 'Payments',
      statusUrl: 'https://status.stripe.com',
      color: '#635BFF'
    },
    {
      name: 'OpenAI',
      slug: 'openai',
      category: 'AI/ML',
      statusUrl: 'https://status.openai.com',
      color: '#10A37F'
    }
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: { slug: service.slug },
      update: {},
      create: service
    });
  }

  console.log('✅ Seeded services');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());