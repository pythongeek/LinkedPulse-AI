# Production Gaps Assessment

Based on an assessment of the codebase, here are the production gaps that need to be addressed before a full production release:

## 1. LinkedIn Scraper Stubbing
The primary scraper class (`backend/src/services/linkedinScraper.ts`) has all of its methods completely stubbed out. It currently returns empty arrays or null values because Puppeteer cannot be run natively on Vercel's serverless functions.
- `scrapeTopicPosts` returns an empty array.
- `scrapeProfile` returns `{ name: null, headline: null, about: null }`.
- `searchTopCreators` returns an empty array.

To resolve this, you need to either transition to the official LinkedIn API or fully utilize the external `browserAutomation.js` worker, moving the Vercel APIs to call that service or using a different deployment platform like Railway/Render.

## 2. Hardcoded Mock Data in Audit and Competitor APIs
Since the scraper is stubbed, the API routes are directly passing mock session tokens to bypass the LinkedIn session requirement.
- **`backend/src/routes/audit.ts`**: Hardcodes `{ liAt: 'mock_liAt', jsessionId: 'mock_jsessionId' }`.
- **`backend/src/routes/competitor.ts`**: Hardcodes `{ liAt: 'mock_liAt', jsessionId: 'mock_jsessionId' }`.

## 3. Dual Job Processing Approaches
There are two completely different, conflicting job processing mechanisms in the codebase:
1. **BullMQ / Redis (`workers/jobProcessor.js`)**: A separate Node.js worker process designed to use BullMQ with Redis for background job queues (e.g., content generation, trend analysis, competitor analysis).
2. **Database Polling / Serverless Cron (`backend/src/services/jobService.ts` & `backend/src/routes/cron.ts`)**: A custom-built queuing system using a PostgreSQL `QueuedJob` table that acts like a state machine with a `/api/cron/tick` endpoint to process jobs sequentially.

The API (`content.ts`) is currently creating database jobs instead of using BullMQ, but the worker process isn't updated to handle it. You must consolidate this into a single job architecture (likely BullMQ if you are using Docker workers, or Vercel cron jobs if fully serverless).

## 4. Fake Trend Analysis
The `TrendAnalyzer` class (`backend/src/services/trendAnalyzer.ts`) originally used `google-trends-api` but now just fakes the data by prompting the MiniMax LLM to generate realistic-looking JSON trend data ("Provide realistic trend data based on your knowledge"). It makes no external API calls to get real trend data.

## 5. Build Errors
The backend had multiple TypeScript build errors:
- Type mismatch in `auth.ts` where Prisma nullable properties didn't match the expected `user` interface.
- Incorrect types passed to `analyzer.identifyGaps` in `competitor.ts` due to Prisma relationships yielding mismatching structures.
- Incorrect `result` formatting in `cron.ts` for the scraper.
- The `minimax.ts` return signature for `.json()` responses needed casting.
The frontend also had an unused variable warning causing a build error in `ContentStudio.tsx`.
*(Note: These build errors have been resolved in this session, but highlight the need for CI/CD checks).*

## 6. Security Vulnerability (Resolved)
There was a hardcoded `demo-token` bypass in the authentication middleware (`backend/src/middleware/auth.ts`) which allowed anyone to impersonate a demo user. *(This has been removed during this session).*

## 7. Unsupported External Tool
The AI functionality makes use of MiniMax, which seems configured, but some prompts (like image prompts) still depend on `gemini-pro`. The fallback structure in `ImageGenerationService` tries Pollinations, then HuggingFace, but `researchService.ts` and `contentGeneration.ts` still mix MiniMax and Gemini depending on the task, creating disjointed dependencies.

## 8. Development Secrets
The repository contains a `.env.example` file that indicates encryption keys and secrets are required, but there's no central key rotation or management strategy defined. The `ENCRYPTION_KEY` in `workers/browserAutomation.js` expects an AES key to decrypt cookies stored in the database.
