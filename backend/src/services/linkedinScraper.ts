import { logger } from '../utils/logger';

/**
 * LinkedIn Scraper — STUBBED
 * Puppeteer cannot run on Vercel serverless.
 * All scraping methods return empty results.
 * Future: Replace with Official LinkedIn API client.
 */

export interface LinkedInPost {
  id: string;
  author: string;
  authorProfile?: string;
  authorTitle?: string;
  content: string;
  likes: number;
  comments: number;
  shares: number;
  timestamp?: string;
  postUrl?: string;
  mediaUrls?: string[];
}

export class LinkedInScraper {
  async scrapeTopicPosts(
    topic: string,
    encryptedCookies: any,
    limit: number = 50
  ): Promise<LinkedInPost[]> {
    logger.warn('LinkedInScraper.scrapeTopicPosts called — stubbed (no Puppeteer on Vercel)');
    return [];
  }

  async scrapeProfile(profileUrl: string, encryptedCookies: any): Promise<any> {
    logger.warn('LinkedInScraper.scrapeProfile called — stubbed');
    return { name: null, headline: null, about: null };
  }

  async searchTopCreators(niche: string, encryptedCookies: any, limit: number = 10): Promise<any[]> {
    logger.warn('LinkedInScraper.searchTopCreators called — stubbed');
    return [];
  }

  getStats() {
    return { totalRequests: 0, hourlyRequests: 0, hourResetTime: 0 };
  }
}
