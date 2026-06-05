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
    // Process Scheduled Content First
    try {
      const now = new Date();
      // Find all contents that are scheduled to be published now or earlier, and are still marked as 'scheduled'
      const scheduledContents = await prisma.content.findMany({
        where: {
          status: 'scheduled',
          scheduledFor: { lte: now },
        },
      });

      for (const content of scheduledContents) {
        try {
          const userId = content.userId;

          // Enforce 5 posts per day limit (UTC consistently)
          const startOfDay = new Date();
          startOfDay.setUTCHours(0, 0, 0, 0);
          
          const publishedTodayCount = await prisma.content.count({
            where: {
              userId,
              status: 'published',
              publishedAt: { gte: startOfDay }
            }
          });

          if (publishedTodayCount >= 5) {
            logger.warn(`User ${userId} has reached the 5 posts/day limit. Rescheduling post ${content.id} for tomorrow.`);
            const tomorrow = new Date(content.scheduledFor!);
            tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
            await prisma.content.update({
              where: { id: content.id },
              data: { scheduledFor: tomorrow }
            });
            continue;
          }

          // Fetch user's token
          let accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
          const session = await prisma.linkedInSession.findUnique({ where: { userId } });
          if (session && session.accessToken) {
            accessToken = session.accessToken;
          }

          if (!accessToken) {
            logger.error(`No LinkedIn access token for user ${userId}. Cannot auto-publish ${content.id}`);
            await prisma.content.update({
              where: { id: content.id },
              data: { status: 'draft' } // Revert to draft if no token
            });
            continue;
          }

          const { LinkedInPublisher } = await import('../services/linkedinPublisher.js');
          const authorUrn = session?.selectedAuthorUrn || undefined;
          const postUrn = await LinkedInPublisher.publishContentRecord(content, accessToken, logger, authorUrn);

          // Update status
          await prisma.content.update({
            where: { id: content.id },
            data: {
              status: 'published',
              publishedAt: new Date(),
            },
          });
          logger.info(`Successfully auto-published scheduled content ${content.id} (URN: ${postUrn})`);
        } catch (publishErr: any) {
          logger.error(`Failed to auto-publish content ${content.id}:`, publishErr);

          const opt = (content.linkedinOptimization || {}) as any;
          const attempts = (opt.publishAttempts || 0) + 1;
          const errMsg = publishErr instanceof Error ? publishErr.message : String(publishErr);

          if (attempts >= 3) {
            // Permanent failure after 3 attempts
            await prisma.content.update({
              where: { id: content.id },
              data: {
                status: 'failed',
                linkedinOptimization: {
                  ...opt,
                  publishAttempts: attempts,
                  publishError: errMsg,
                },
              },
            });
            logger.error(`Scheduled post ${content.id} failed permanently after 3 attempts. Error: ${errMsg}`);
          } else {
            // Reschedule for 15 minutes later
            const nextTry = new Date();
            nextTry.setUTCMinutes(nextTry.getUTCMinutes() + 15);
            await prisma.content.update({
              where: { id: content.id },
              data: {
                scheduledFor: nextTry,
                linkedinOptimization: {
                  ...opt,
                  publishAttempts: attempts,
                  publishError: errMsg,
                },
              },
            });
            logger.info(`Rescheduled post ${content.id} for retry ${attempts + 1} at ${nextTry.toISOString()}`);
          }
        }
      }
    } catch (schedErr) {
      logger.error('Error processing scheduled content:', schedErr);
    }

    const job = await JobService.getNextJob();
    
    if (!job) {
      return res.json({ message: 'No pending jobs, scheduled content checked' });
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
                status: options.status || 'draft',
                scheduledFor: options.scheduledFor ? new Date(options.scheduledFor) : null,
                engagementPrediction: genResult.engagementPrediction,
                seoScore: genResult.seoScore,
                hookSuggestions: genResult.hookSuggestions,
                bestPostingTime: genResult.bestPostingTime,
                linkedinOptimization: genResult.linkedinOptimization,
                competitiveAnalysis: genResult.competitiveAnalysis,
                // Structured output fields
                slides: (genResult.slides || null) as any,
                firstComment: genResult.firstComment || null,
                hookFormula: options.hookFormula || null,
                charCount: genResult.charCount || null,
                wordCount: genResult.wordCount || null,
                pollQuestion: genResult.pollQuestion || null,
                pollOptions: (genResult.pollOptions || null) as any,
                pollDuration: options.pollDuration || null,
                articleTitle: genResult.articleTitle || null,
                articleExcerpt: genResult.articleExcerpt || null,
                researchQuality: genResult.researchQuality || null,
                dataSourceCount: genResult.dataSourceCount || null,
                isAiGrounded: genResult.isAiGrounded ?? false,
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

        case 'COMPETITOR_ANALYSIS': {
          const { CompetitorAnalyzer } = await import('../services/competitorAnalyzer.js');
          const analyzer = new CompetitorAnalyzer();
          const { topic, depth, postLimit, userId, cacheKey } = payload;
          
          try {
            if (job.phase === 0) {
              const p0Result = await analyzer.generatePhase0(topic, depth);
              await JobService.progressToNextPhase(job.id, 1, p0Result);
              return res.json({ message: 'Competitor Phase 0 complete', jobId: job.id, phase: 0 });
            } else if (job.phase === 1) {
              const p1Result = await analyzer.generatePhase1(topic, depth, job.intermediateResult);
              await JobService.progressToNextPhase(job.id, 2, p1Result);
              return res.json({ message: 'Competitor Phase 1 complete', jobId: job.id, phase: 1 });
            } else if (job.phase === 2) {
              const p2Result = await analyzer.generatePhase2(topic, depth, job.intermediateResult);
              await JobService.progressToNextPhase(job.id, 3, p2Result);
              return res.json({ message: 'Competitor Phase 2 complete', jobId: job.id, phase: 2 });
            } else if (job.phase === 3) {
              const analysis = await analyzer.generatePhase3([], topic, depth, job.intermediateResult);

              // 3. Upsert topic record
              const topicRecord = await prisma.topic.upsert({
                where: { keyword: topic.toLowerCase() },
                update: {
                  competitionData: analysis as any,
                  lastAnalyzed: new Date(),
                },
                create: {
                  keyword: topic.toLowerCase(),
                  competitionData: analysis as any,
                  lastAnalyzed: new Date(),
                },
              });

              // 4. Save enriched posts to database
              if (analysis.allPosts.length > 0) {
                await prisma.competitorPost.createMany({
                  data: analysis.allPosts.map((post: any) => ({
                    topicId: topicRecord.id,
                    author: post.author,
                    authorProfile: post.authorProfile,
                    content: post.content,
                    hookText: post.hookText,
                    contentFormat: post.contentFormat,
                    likes: post.likes,
                    comments: post.comments,
                    shares: post.shares,
                    engagementRate: post.engagementRate,
                    viralScore: post.viralScore,
                    wordCount: post.wordCount,
                    emojiCount: post.emojiCount,
                    hashtagsUsed: post.hashtagsUsed,
                    hasMedia: post.hasMedia,
                    hasLink: post.hasLink,
                    ctaPresent: post.ctaPresent,
                    dayOfWeek: post.dayOfWeek >= 0 ? post.dayOfWeek : null,
                    hourPosted: post.hourPosted >= 0 ? post.hourPosted : null,
                    postUrl: post.postUrl,
                    postedAt: post.postedAt ? new Date(post.postedAt) : null,
                    dataSource: post.dataSource,
                  })),
                  skipDuplicates: true,
                });
              }

              // 5. Save analysis snapshot
              await prisma.analysisSnapshot.create({
                data: {
                  userId,
                  topicKeyword: topic.toLowerCase(),
                  snapshotData: analysis as any,
                  postCount: analysis.totalPostsAnalyzed,
                  avgEngagement: analysis.avgEngagement.likes + analysis.avgEngagement.comments,
                  topGaps: analysis.contentGaps.slice(0, 5).map((g: any) => g.title),
                },
              });

              // 6. Cache result
              await prisma.researchCache.create({
                data: {
                  query: cacheKey,
                  queryType: 'competitor_analysis',
                  results: analysis as any,
                  source: analysis.dataSource,
                  expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours
                },
              });

              result = { success: true, analysis };
              // We don't break here, we let the common JobService.updateJob below handle COMPLETED
              break;
            }
          } catch (phaseErr: any) {
            logger.error(`[Cron] Competitor Analysis Phase ${job.phase} failed:`, phaseErr);
            throw phaseErr;
          }
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

/**
 * Process a specific job (for frontend polling)
 */
router.post('/advance/:id', async (req, res) => {
  try {
    const job = await JobService.getJob(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    if (job.status !== 'PENDING') {
      return res.json({ job });
    }

    // Mark as processing
    await JobService.markAsProcessing(job.id);
    logger.info(`Advancing job ${job.id} (${job.type}) Phase ${job.phase}`);

    const payload = job.payload as any;
    let result;

    try {
      switch (job.type) {
        case 'CONTENT_GENERATION': {
          const contentService = new ContentGenerationService();
          const { options, userId } = payload;
          
          if (job.phase === 0) {
            const p0Result = await contentService.generatePhase0(options);
            await JobService.progressToNextPhase(job.id, 1, p0Result);
            return res.json({ message: 'Phase 0 complete', job: await JobService.getJob(job.id) });
          } else if (job.phase === 1) {
            const p1Result = await contentService.generatePhase1(options, job.intermediateResult);
            await JobService.progressToNextPhase(job.id, 2, p1Result);
            return res.json({ message: 'Phase 1 complete', job: await JobService.getJob(job.id) });
          } else if (job.phase === 2) {
            const p2Result = await contentService.generatePhase2(options, job.intermediateResult);
            await JobService.progressToNextPhase(job.id, 3, p2Result);
            return res.json({ message: 'Phase 2 complete', job: await JobService.getJob(job.id) });
          } else if (job.phase === 3) {
            const p3Result = await contentService.generatePhase3(options, job.intermediateResult);
            await JobService.progressToNextPhase(job.id, 4, p3Result);
            return res.json({ message: 'Phase 3 complete', job: await JobService.getJob(job.id) });
          } else if (job.phase === 4) {
            const p4Result = await contentService.generatePhase4(options, job.intermediateResult);
            await JobService.progressToNextPhase(job.id, 5, p4Result);
            return res.json({ message: 'Phase 4 complete', job: await JobService.getJob(job.id) });
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
                status: options.status || 'draft',
                scheduledFor: options.scheduledFor ? new Date(options.scheduledFor) : null,
                engagementPrediction: genResult.engagementPrediction,
                seoScore: genResult.seoScore,
                hookSuggestions: genResult.hookSuggestions,
                bestPostingTime: genResult.bestPostingTime,
                linkedinOptimization: genResult.linkedinOptimization,
                competitiveAnalysis: genResult.competitiveAnalysis,
                slides: (genResult.slides || null) as any,
                firstComment: genResult.firstComment || null,
                hookFormula: options.hookFormula || null,
                charCount: genResult.charCount || null,
                wordCount: genResult.wordCount || null,
                pollQuestion: genResult.pollQuestion || null,
                pollOptions: (genResult.pollOptions || null) as any,
                pollDuration: options.pollDuration || null,
                articleTitle: genResult.articleTitle || null,
                articleExcerpt: genResult.articleExcerpt || null,
                researchQuality: genResult.researchQuality || null,
                dataSourceCount: genResult.dataSourceCount || null,
                isAiGrounded: genResult.isAiGrounded ?? false,
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
        case 'COMPETITOR_ANALYSIS': {
          const { CompetitorAnalyzer } = await import('../services/competitorAnalyzer.js');
          const analyzer = new CompetitorAnalyzer();
          const { topic, depth, userId, cacheKey } = payload;
          
          if (job.phase === 0) {
            const p0Result = await analyzer.generatePhase0(topic, depth);
            await JobService.progressToNextPhase(job.id, 1, p0Result);
            return res.json({ message: 'Competitor Phase 0 complete', job: await JobService.getJob(job.id) });
          } else if (job.phase === 1) {
            const p1Result = await analyzer.generatePhase1(topic, depth, job.intermediateResult);
            await JobService.progressToNextPhase(job.id, 2, p1Result);
            return res.json({ message: 'Competitor Phase 1 complete', job: await JobService.getJob(job.id) });
          } else if (job.phase === 2) {
            const p2Result = await analyzer.generatePhase2(topic, depth, job.intermediateResult);
            await JobService.progressToNextPhase(job.id, 3, p2Result);
            return res.json({ message: 'Competitor Phase 2 complete', job: await JobService.getJob(job.id) });
          } else if (job.phase === 3) {
            const analysis = await analyzer.generatePhase3([], topic, depth, job.intermediateResult);

            const topicRecord = await prisma.topic.upsert({
              where: { keyword: topic.toLowerCase() },
              update: { competitionData: analysis as any, lastAnalyzed: new Date() },
              create: { keyword: topic.toLowerCase(), competitionData: analysis as any, lastAnalyzed: new Date() },
            });

            if (analysis.allPosts.length > 0) {
              await prisma.competitorPost.createMany({
                data: analysis.allPosts.map((post: any) => ({
                  topicId: topicRecord.id,
                  author: post.author,
                  authorProfile: post.authorProfile,
                  content: post.content,
                  hookText: post.hookText,
                  contentFormat: post.contentFormat,
                  likes: post.likes,
                  comments: post.comments,
                  shares: post.shares,
                  engagementRate: post.engagementRate,
                  viralScore: post.viralScore,
                  wordCount: post.wordCount,
                  emojiCount: post.emojiCount,
                  hashtagsUsed: post.hashtagsUsed,
                  hasMedia: post.hasMedia,
                  hasLink: post.hasLink,
                  ctaPresent: post.ctaPresent,
                  dayOfWeek: post.dayOfWeek >= 0 ? post.dayOfWeek : null,
                  hourPosted: post.hourPosted >= 0 ? post.hourPosted : null,
                  postUrl: post.postUrl,
                  postedAt: post.postedAt ? new Date(post.postedAt) : null,
                  dataSource: post.dataSource,
                })),
                skipDuplicates: true,
              });
            }

            await prisma.analysisSnapshot.create({
              data: {
                userId,
                topicKeyword: topic.toLowerCase(),
                snapshotData: analysis as any,
                postCount: analysis.totalPostsAnalyzed,
                avgEngagement: analysis.avgEngagement.likes + analysis.avgEngagement.comments,
                topGaps: analysis.contentGaps.slice(0, 5).map((g: any) => g.title),
              },
            });

            await prisma.researchCache.create({
              data: {
                query: cacheKey,
                queryType: 'competitor_analysis',
                results: analysis as any,
                source: analysis.dataSource,
                expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
              },
            });

            result = { success: true, analysis };
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
      return res.json({ job: await JobService.getJob(job.id) });
    } catch (error) {
      logger.error(`Job ${job.id} failed:`, error);
      
      const attempts = (job.attempts || 0) + 1;
      const shouldRetry = attempts < (job.maxAttempts || 3);
      
      await JobService.updateJob(job.id, {
        status: shouldRetry ? 'PENDING' : 'FAILED',
        error: error instanceof Error ? error.message : String(error),
        attempts,
        runAt: shouldRetry ? new Date(Date.now() + 1000 * 60 * Math.pow(2, attempts)) : job.runAt,
      });
      return res.json({ job: await JobService.getJob(job.id) });
    }
  } catch (error) {
    logger.error('Advance job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
