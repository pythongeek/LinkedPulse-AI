/**
 * Background Job Processor
 * 
 * Processes queued jobs using BullMQ:
 * - Content generation
 * - Trend analysis
 * - Competitor analysis
 * - Image generation
 */

const { Queue, Worker } = require('bullmq');
const { PrismaClient } = require('@prisma/client');
const IORedis = require('ioredis');

const prisma = new PrismaClient();
const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

// Job queues
const contentQueue = new Queue('content-generation', { connection: redis });
const trendQueue = new Queue('trend-analysis', { connection: redis });
const competitorQueue = new Queue('competitor-analysis', { connection: redis });
const imageQueue = new Queue('image-generation', { connection: redis });

// Content generation worker
const contentWorker = new Worker(
  'content-generation',
  async (job) => {
    console.log(`Processing content job ${job.id}:`, job.data);
    
    const { contentId } = job.data;
    
    // Update content status
    await prisma.content.update({
      where: { id: contentId },
      data: { status: 'processing' },
    });

    try {
      // Content generation is handled by the API
      // This worker just manages the queue
      
      await prisma.content.update({
        where: { id: contentId },
        data: { status: 'completed' },
      });

      return { success: true, contentId };
    } catch (error) {
      await prisma.content.update({
        where: { id: contentId },
        data: { status: 'failed' },
      });
      throw error;
    }
  },
  { connection: redis }
);

// Trend analysis worker
const trendWorker = new Worker(
  'trend-analysis',
  async (job) => {
    console.log(`Processing trend job ${job.id}:`, job.data);
    
    const { topic, userId } = job.data;
    
    // Process trend analysis
    // This would call the trend analyzer service
    
    return { success: true, topic };
  },
  { connection: redis }
);

// Competitor analysis worker
const competitorWorker = new Worker(
  'competitor-analysis',
  async (job) => {
    console.log(`Processing competitor job ${job.id}:`, job.data);
    
    const { topic, userId } = job.data;
    
    // Process competitor analysis
    // This would call the competitor analyzer service
    
    return { success: true, topic };
  },
  { connection: redis }
);

// Image generation worker
const imageWorker = new Worker(
  'image-generation',
  async (job) => {
    console.log(`Processing image job ${job.id}:`, job.data);
    
    const { prompt, contentId } = job.data;
    
    // Process image generation
    // This would call the image generation service
    
    return { success: true, prompt };
  },
  { connection: redis }
);

// Event handlers
contentWorker.on('completed', (job) => {
  console.log(`Content job ${job.id} completed`);
});

contentWorker.on('failed', (job, err) => {
  console.error(`Content job ${job?.id} failed:`, err);
});

trendWorker.on('completed', (job) => {
  console.log(`Trend job ${job.id} completed`);
});

competitorWorker.on('completed', (job) => {
  console.log(`Competitor job ${job.id} completed`);
});

imageWorker.on('completed', (job) => {
  console.log(`Image job ${job.id} completed`);
});

console.log('Job processor started');
console.log('Listening for jobs...');

// Keep the process running
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await contentWorker.close();
  await trendWorker.close();
  await competitorWorker.close();
  await imageWorker.close();
  await redis.quit();
  await prisma.$disconnect();
  process.exit(0);
});
