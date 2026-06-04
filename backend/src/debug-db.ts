import { prisma } from './server';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const jobs = await prisma.queuedJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log('--- LATEST 10 JOBS IN DB ---');
  jobs.forEach(j => {
    console.log(`ID: ${j.id}`);
    console.log(`Type: ${j.type}`);
    console.log(`Status: ${j.status}`);
    console.log(`Phase: ${j.phase}/${j.totalPhases}`);
    console.log(`Error: ${j.error}`);
    console.log(`Payload: ${JSON.stringify(j.payload)}`);
    console.log('----------------------------');
  });
}

main().catch(console.error);
