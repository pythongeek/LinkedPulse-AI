export interface ApiCapabilities {
  hasRealTrends: boolean;
  hasRealResearch: boolean;
  hasRealNews: boolean;
  hasCaching: boolean;
  hasLinkedInOAuth: boolean;
  hasImageGen: boolean;
  degradationLevel: 'full' | 'partial' | 'ai-only';
  missingApis: string[];
}

export function getApiCapabilities(): ApiCapabilities {
  const missing: string[] = [];

  const hasRealTrends = !!process.env.GEMINI_API_KEY; // Managed via Gemini Grounded search
  const hasRealResearch = !!process.env.GEMINI_API_KEY;
  const hasRealNews = !!process.env.GEMINI_API_KEY;
  const hasCaching = !!process.env.REDIS_URL;
  const hasLinkedInOAuth = !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET);
  const hasImageGen = !!(process.env.HUGGINGFACE_API_KEY || process.env.IMAGE_PROVIDER);

  if (!hasRealTrends) missing.push('Gemini API (GEMINI_API_KEY) — required for grounded trend analysis');
  if (!hasRealResearch) missing.push('Gemini Grounding (GEMINI_API_KEY) — required for real-time web research');
  if (!hasCaching) missing.push('Upstash Redis (REDIS_URL) — no caching enabled, higher latency');
  if (!hasLinkedInOAuth) missing.push('LinkedIn OAuth (LINKEDIN_CLIENT_ID/SECRET) — publishing will fall back to cookie session');
  if (!hasImageGen) missing.push('Image Gen Provider — image generation will be disabled');

  const realApisCount = [hasRealTrends, hasRealResearch, hasRealNews].filter(Boolean).length;
  const degradationLevel = realApisCount >= 3 ? 'full' : realApisCount >= 1 ? 'partial' : 'ai-only';

  return {
    hasRealTrends,
    hasRealResearch,
    hasRealNews,
    hasCaching,
    hasLinkedInOAuth,
    hasImageGen,
    degradationLevel,
    missingApis: missing,
  };
}
