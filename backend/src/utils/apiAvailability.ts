export interface ApiCapabilities {
  hasRealTrends: boolean;
  hasRealResearch: boolean;
  hasRealNews: boolean;
  hasCaching: boolean;
  hasLinkedInOAuth: boolean;
  hasImageGen: boolean;
  imageProviderChain: string[];
  geminiGroundingEnabled: boolean;
  degradationLevel: 'full' | 'partial' | 'ai-only';
  missingApis: string[];
}

export function getApiCapabilities(): ApiCapabilities {
  const missing: string[] = [];

  const hasRealTrends = !!process.env.GEMINI_API_KEY; // Managed via Gemini Grounded search
  const hasRealResearch = !!process.env.GEMINI_API_KEY;
  const hasRealNews = !!process.env.GEMINI_API_KEY;
  const geminiGroundingEnabled = !!process.env.GEMINI_API_KEY;
  const hasCaching = !!process.env.REDIS_URL;
  const hasLinkedInOAuth = !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET);
  
  const imageProviderChain: string[] = [];
  if (process.env.FAL_API_KEY) imageProviderChain.push('Fal.ai');
  if (process.env.HUGGINGFACE_API_KEY) imageProviderChain.push('HuggingFace');
  imageProviderChain.push('Pollinations');
  
  const hasImageGen = true; // Pollinations is always available

  if (!hasRealTrends) missing.push('Gemini API (GEMINI_API_KEY) — required for grounded trend analysis');
  if (!hasRealResearch) missing.push('Gemini Grounding (GEMINI_API_KEY) — required for real-time web research');
  if (!hasCaching) missing.push('Upstash Redis (REDIS_URL) — no caching enabled, higher latency');
  if (!hasLinkedInOAuth) missing.push('LinkedIn OAuth (LINKEDIN_CLIENT_ID/SECRET) — publishing will fall back to cookie session');
  if (!process.env.FAL_API_KEY) missing.push('Fal.ai API (FAL_API_KEY) — premium image generation disabled, falling back to free tiers');

  const realApisCount = [hasRealTrends, hasRealResearch, hasRealNews].filter(Boolean).length;
  const degradationLevel = realApisCount >= 3 ? 'full' : realApisCount >= 1 ? 'partial' : 'ai-only';

  return {
    hasRealTrends,
    hasRealResearch,
    hasRealNews,
    hasCaching,
    hasLinkedInOAuth,
    hasImageGen,
    imageProviderChain,
    geminiGroundingEnabled,
    degradationLevel,
    missingApis: missing,
  };
}
