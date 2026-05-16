import { prisma } from '../server';
import { JobStatus, QueuedJob } from '@prisma/client';

export type JobType = 'CONTENT_GENERATION' | 'LINKEDIN_SCRAPE' | 'TREND_ANALYSIS' | 'COMPETITOR_ANALYSIS' | 'IMAGE_GENERATION';

export class JobService {
  /**
   * Enqueue a new job
   */
  static async enqueue(type: JobType, payload: any, priority: number = 0): Promise<QueuedJob> {
    return prisma.queuedJob.create({
      data: {
        type,
        payload,
        priority,
        status: 'PENDING',
      },
    });
  }

  /**
   * Get the next pending job to process
   */
  static async getNextJob(): Promise<QueuedJob | null> {
    return prisma.queuedJob.findFirst({
      where: {
        status: 'PENDING',
        runAt: {
          lte: new Date(),
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
    });
  }

  /**
   * Update job status and results
   */
  static async updateJob(id: string, data: Partial<QueuedJob>): Promise<QueuedJob> {
    return prisma.queuedJob.update({
      where: { id },
      data,
    });
  }

  /**
   * Mark job as processing
   */
  static async markAsProcessing(id: string): Promise<QueuedJob> {
    return prisma.queuedJob.update({
      where: { id },
      data: {
        status: 'PROCESSING',
        attempts: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Get job status
   */
  static async getJob(id: string): Promise<QueuedJob | null> {
    return prisma.queuedJob.findUnique({
      where: { id },
    });
  }
}
