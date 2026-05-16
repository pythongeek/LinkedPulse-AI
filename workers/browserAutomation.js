/**
 * Browser Automation Worker
 * 
 * This worker handles human-like LinkedIn browsing automation.
 * It can:
 * 1. Browse LinkedIn like a human
 * 2. Search for topics and collect ideas
 * 3. Scrape content following LinkedIn's rules
 * 4. Work with user-provided logged-in sessions
 */

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const crypto = require('crypto-js');

// Add stealth plugin
puppeteer.use(StealthPlugin());

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3002;

app.use(express.json());

// Encryption helper
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';

function decrypt(encryptedData) {
  const bytes = crypto.AES.decrypt(encryptedData, ENCRYPTION_KEY);
  return bytes.toString(crypto.enc.Utf8);
}

/**
 * Initialize browser with human-like settings
 */
async function initBrowser() {
  return puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
    ],
  });
}

/**
 * Sleep for random duration (human-like delays)
 */
function sleep(ms) {
  const jitter = Math.random() * 1000;
  return new Promise(resolve => setTimeout(resolve, ms + jitter));
}

/**
 * Login to LinkedIn with cookies
 */
async function loginWithCookies(page, cookies) {
  try {
    await page.setCookie(
      {
        name: 'li_at',
        value: cookies.liAt,
        domain: '.linkedin.com',
        path: '/',
        secure: true,
        httpOnly: true,
      },
      {
        name: 'JSESSIONID',
        value: cookies.jsessionId,
        domain: '.www.linkedin.com',
        path: '/',
        secure: true,
        httpOnly: false,
      }
    );

    await page.goto('https://www.linkedin.com/feed/', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    await sleep(3000);

    const isLoggedIn = await page.evaluate(() => {
      return !document.querySelector('.sign-in-form') &&
             document.querySelector('.feed-identity-module');
    });

    return isLoggedIn;
  } catch (error) {
    console.error('Login error:', error);
    return false;
  }
}

/**
 * Browse LinkedIn feed like a human
 */
async function browseLikeHuman(page, duration = 60000) {
  const actions = [];
  const startTime = Date.now();

  while (Date.now() - startTime < duration) {
    const action = Math.random();

    if (action < 0.3) {
      // Scroll down
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight * 0.7);
      });
      actions.push('scroll');
    } else if (action < 0.5) {
      // Like a post
      const likeButtons = await page.$$('button.react-button__trigger');
      if (likeButtons.length > 0) {
        const randomIndex = Math.floor(Math.random() * Math.min(likeButtons.length, 3));
        await likeButtons[randomIndex]?.click();
        actions.push('like');
      }
    } else if (action < 0.6) {
      // Click on a post
      const posts = await page.$$('a.app-aware-link.feed-shared-actor__container-link');
      if (posts.length > 0) {
        const randomIndex = Math.floor(Math.random() * Math.min(posts.length, 5));
        await posts[randomIndex]?.click();
        await sleep(5000);
        await page.goBack();
        actions.push('click_post');
      }
    }

    // Random delay between actions
    await sleep(3000 + Math.random() * 5000);
  }

  return actions;
}

/**
 * Search for topics and collect ideas
 */
async function searchAndCollectIdeas(page, topic, limit = 20) {
  const ideas = [];

  try {
    // Search for topic
    const searchUrl = `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(topic)}&sortBy=date_posted`;
    
    await page.goto(searchUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    await sleep(5000);

    // Scroll and collect posts
    let scrollCount = 0;
    const maxScrolls = Math.ceil(limit / 5);

    while (ideas.length < limit && scrollCount < maxScrolls) {
      const posts = await page.evaluate(() => {
        const elements = document.querySelectorAll('.feed-shared-update-v2');
        const extracted = [];

        elements.forEach(post => {
          const contentEl = post.querySelector('.feed-shared-text');
          const authorEl = post.querySelector('.update-components-actor__name');
          const likesEl = post.querySelector('.reactions-count');

          if (contentEl) {
            extracted.push({
              content: contentEl.textContent?.trim(),
              author: authorEl?.textContent?.trim(),
              likes: likesEl?.textContent?.trim() || '0',
            });
          }
        });

        return extracted;
      });

      // Add unique ideas
      for (const post of posts) {
        if (ideas.length >= limit) break;
        
        const isDuplicate = ideas.some(i => i.content === post.content);
        if (!isDuplicate && post.content) {
          ideas.push(post);
        }
      }

      // Scroll down
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });

      await sleep(4000);
      scrollCount++;
    }

    return ideas;
  } catch (error) {
    console.error('Search and collect error:', error);
    return ideas;
  }
}

/**
 * Scrape content following LinkedIn rules
 */
async function scrapeContent(page, url) {
  try {
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    await sleep(3000);

    const content = await page.evaluate(() => {
      const contentEl = document.querySelector('.feed-shared-text');
      const authorEl = document.querySelector('.update-components-actor__name');
      const likesEl = document.querySelector('.reactions-count');
      const commentsEl = document.querySelector('.comments-count');

      return {
        content: contentEl?.textContent?.trim(),
        author: authorEl?.textContent?.trim(),
        likes: likesEl?.textContent?.trim() || '0',
        comments: commentsEl?.textContent?.trim() || '0',
        scrapedAt: new Date().toISOString(),
      };
    });

    return content;
  } catch (error) {
    console.error('Scrape content error:', error);
    return null;
  }
}

// API Routes

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

/**
 * Start browsing session
 * POST /browse
 */
app.post('/browse', async (req, res) => {
  const { userId, duration = 60000 } = req.body;

  try {
    // Get user's LinkedIn session
    const session = await prisma.linkedinSession.findUnique({
      where: { userId },
    });

    if (!session || !session.isActive) {
      return res.status(400).json({ error: 'No active LinkedIn session' });
    }

    const cookies = {
      liAt: decrypt(session.liAt),
      jsessionId: decrypt(session.jsessionId),
    };

    const browser = await initBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    const loggedIn = await loginWithCookies(page, cookies);
    if (!loggedIn) {
      await browser.close();
      return res.status(401).json({ error: 'Failed to login to LinkedIn' });
    }

    // Browse like human
    const actions = await browseLikeHuman(page, duration);

    // Update last used
    await prisma.linkedinSession.update({
      where: { userId },
      data: { lastUsed: new Date() },
    });

    await browser.close();

    res.json({
      success: true,
      actions,
      duration,
    });
  } catch (error) {
    console.error('Browse error:', error);
    res.status(500).json({ error: 'Browse failed' });
  }
});

/**
 * Search and collect ideas
 * POST /search-ideas
 */
app.post('/search-ideas', async (req, res) => {
  const { userId, topic, limit = 20 } = req.body;

  try {
    const session = await prisma.linkedinSession.findUnique({
      where: { userId },
    });

    if (!session || !session.isActive) {
      return res.status(400).json({ error: 'No active LinkedIn session' });
    }

    const cookies = {
      liAt: decrypt(session.liAt),
      jsessionId: decrypt(session.jsessionId),
    };

    const browser = await initBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    const loggedIn = await loginWithCookies(page, cookies);
    if (!loggedIn) {
      await browser.close();
      return res.status(401).json({ error: 'Failed to login' });
    }

    const ideas = await searchAndCollectIdeas(page, topic, limit);

    await prisma.linkedinSession.update({
      where: { userId },
      data: { lastUsed: new Date() },
    });

    await browser.close();

    res.json({
      success: true,
      ideas,
      count: ideas.length,
    });
  } catch (error) {
    console.error('Search ideas error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * Scrape specific content
 * POST /scrape
 */
app.post('/scrape', async (req, res) => {
  const { userId, url } = req.body;

  try {
    const session = await prisma.linkedinSession.findUnique({
      where: { userId },
    });

    if (!session || !session.isActive) {
      return res.status(400).json({ error: 'No active LinkedIn session' });
    }

    const cookies = {
      liAt: decrypt(session.liAt),
      jsessionId: decrypt(session.jsessionId),
    };

    const browser = await initBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    const loggedIn = await loginWithCookies(page, cookies);
    if (!loggedIn) {
      await browser.close();
      return res.status(401).json({ error: 'Failed to login' });
    }

    const content = await scrapeContent(page, url);

    await prisma.linkedinSession.update({
      where: { userId },
      data: { lastUsed: new Date() },
    });

    await browser.close();

    res.json({
      success: true,
      content,
    });
  } catch (error) {
    console.error('Scrape error:', error);
    res.status(500).json({ error: 'Scrape failed' });
  }
});

/**
 * Get browsing stats
 * GET /stats/:userId
 */
app.get('/stats/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const session = await prisma.linkedinSession.findUnique({
      where: { userId },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      isActive: session.isActive,
      lastUsed: session.lastUsed,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Browser automation worker running on port ${PORT}`);
});
