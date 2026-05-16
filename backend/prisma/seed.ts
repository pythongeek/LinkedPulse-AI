import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create demo user
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      id: 'demo-user-id',
      email: 'demo@example.com',
      name: 'Demo User',
      password: await bcrypt.hash('demo-password', 12),
    },
  });

  console.log('Demo user created:', demoUser.email);

  // Create demo usage stats
  await prisma.usageStats.upsert({
    where: { userId: demoUser.id },
    update: {},
    create: {
      userId: demoUser.id,
      contentsGenerated: 0,
      topicsResearched: 0,
      imagesCreated: 0,
      apiCalls: 0,
    },
  });

  console.log('Demo usage stats created');

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
