import express from 'express';
import { JobService } from '../services/jobService';
import { logger } from '../utils/logger';
import { ContentGenerationService } from '../services/contentGeneration';
import { LinkedInScraper } from '../services/linkedinScraper';
import { prisma } from '../server';

const router = express.Router();

router.get('/migrate', async (req, res) => {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "contents" ADD COLUMN IF NOT EXISTS "seo_score" DOUBLE PRECISION;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "contents" ADD COLUMN IF NOT EXISTS "hook_suggestions" JSONB;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "contents" ADD COLUMN IF NOT EXISTS "best_posting_time" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "contents" ADD COLUMN IF NOT EXISTS "linkedin_optimization" JSONB;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "contents" ADD COLUMN IF NOT EXISTS "competitive_analysis" JSONB;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "linkedin_sessions" ALTER COLUMN "li_at" DROP NOT NULL;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "linkedin_sessions" ALTER COLUMN "jsession_id" DROP NOT NULL;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "linkedin_sessions" ADD COLUMN IF NOT EXISTS "access_token" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "linkedin_sessions" ADD COLUMN IF NOT EXISTS "refresh_token" TEXT;`);
    res.json({ success: true, message: "Migration completed successfully" });
  } catch (error) {
    logger.error('Migration error:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

router.get('/tick', async (req, res) => {
  const cronSecret = req.headers['x-cron-secret'] || req.query.secret;
  
  if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
    logger.warn('Unauthorized cron tick attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const job = await JobService.getNextJob();
    
    if (!job) {
      return res.json({ message: 'No pending jobs' });
    }

    // Mark as processing
    await JobService.markAsProcessing(job.id);
    logger.info(`Processing job ${job.id} (${job.type})`);

    const payload = job.payload as any;

    try {
      let result;

      switch (job.type) {
        case 'CONTENT_GENERATION': {
          const contentService = new ContentGenerationService();
          const { options, userId } = payload;
          
          if (job.phase === 0) {
            const p0Result = await contentService.generatePhase0(options);
            await JobService.progressToNextPhase(job.id, 1, p0Result);
            return res.json({ message: 'Phase 0 complete', jobId: job.id, phase: 0 });
          } else if (job.phase === 1) {
            const p1Result = await contentService.generatePhase1(options, job.intermediateResult);
            await JobService.progressToNextPhase(job.id, 2, p1Result);
            return res.json({ message: 'Phase 1 complete', jobId: job.id, phase: 1 });
          } else if (job.phase === 2) {
            const p2Result = await contentService.generatePhase2(options, job.intermediateResult);
            await JobService.progressToNextPhase(job.id, 3, p2Result);
            return res.json({ message: 'Phase 2 complete', jobId: job.id, phase: 2 });
          } else if (job.phase === 3) {
            const p3Result = await contentService.generatePhase3(options, job.intermediateResult);
            await JobService.progressToNextPhase(job.id, 4, p3Result);
            return res.json({ message: 'Phase 3 complete', jobId: job.id, phase: 3 });
          } else if (job.phase === 4) {
            const p4Result = await contentService.generatePhase4(options, job.intermediateResult);
            await JobService.progressToNextPhase(job.id, 5, p4Result);
            return res.json({ message: 'Phase 4 complete', jobId: job.id, phase: 4 });
          } else if (job.phase === 5) {
            const genResult = await contentService.generatePhase5(options, job.intermediateResult);
            
            const savedContent = await prisma.content.create({
              data: {
                userId,
                contentType: options.contentType,
                title: genResult.title,
                body: genResult.content,
                outline: options.outline || genResult.outline,
                researchData: genResult.researchData,
                sources: genResult.sources,
                images: genResult.images || [],
                status: 'draft',
                engagementPrediction: genResult.engagementPrediction,
                seoScore: genResult.seoScore,
                hookSuggestions: genResult.hookSuggestions,
                bestPostingTime: genResult.bestPostingTime,
                linkedinOptimization: genResult.linkedinOptimization,
                competitiveAnalysis: genResult.competitiveAnalysis,
              },
            });

            await prisma.usageStats.updateMany({
              where: { userId },
              data: { contentsGenerated: { increment: 1 } },
            });

            result = { success: true, contentId: savedContent.id };
          }
          break;
        }

        case 'LINKEDIN_SCRAPE': {
          const scraper = new LinkedInScraper();
          const { topic, cookies, limit } = payload;
          const posts = await scraper.scrapeTopicPosts(topic, cookies, limit);
          result = { success: true, count: posts.length, posts };
          break;
        }

        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      await JobService.updateJob(job.id, {
        status: 'COMPLETED',
        result: result as any,
      });
      
      logger.info(`Job ${job.id} completed successfully`);
    } catch (error) {
      logger.error(`Job ${job.id} failed:`, error);
      
      const attempts = (job.attempts || 0) + 1;
      const shouldRetry = attempts < (job.maxAttempts || 3);
      
      await JobService.updateJob(job.id, {
        status: shouldRetry ? 'PENDING' : 'FAILED',
        error: error instanceof Error ? error.message : String(error),
        attempts,
        // Exponential backoff or simple delay
        runAt: shouldRetry ? new Date(Date.now() + 1000 * 60 * Math.pow(2, attempts)) : job.runAt,
      });
    }

    res.json({ message: 'Tick processed', jobId: job.id });
  } catch (error) {
    logger.error('Cron tick error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get job status (for frontend polling)
 */
router.get('/status/:id', async (req, res) => {
  try {
    const job = await JobService.getJob(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json({ job });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
