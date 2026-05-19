import { prisma } from './server';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const sessions = await prisma.linkedInSession.findMany();
  console.log('LinkedIn Sessions in DB:', JSON.stringify(sessions, null, 2));
  
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      linkedinCookies: true
    }
  });
  console.log('Users in DB:', JSON.stringify(users, null, 2));
}

main().catch(console.error);
