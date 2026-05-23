// Content type determines hashtag range, hook formulas, and char limits
export type ContentTypeTarget =
  | 'post'        // 3,000 chars, 3-5 hashtags, hook window 210 chars
  | 'carousel'    // Caption 3,000 chars, 3-5 hashtags, 7-15 slides
  | 'article'     // 110,000 chars, 0-3 hashtags, SEO-first
  | 'poll';       // 3,000 intro, 3-5 hashtags, question 140 chars

// Topic type drives research strategy, gap framing, and hook formula defaults
export type TopicType =
  | 'thought_leadership'  // Opinions, takes, frameworks
  | 'industry_news'       // Reporting, commentary on events
  | 'how_to'              // Tutorials, step-by-step guides
  | 'career_professional' // Job advice, hiring, workplace culture
  | 'data_insights'       // Research, statistics, benchmarks
  | 'case_study'          // Real examples, stories, wins/losses
  | 'product_launch'      // Announcing, reviewing products/tools
  | 'community_question'; // Polls, surveys, discussion starters

// Audience segment — determines vocabulary level and angle depth
export type AudienceSegment =
  | 'c_suite'         // CEOs, CTOs, CMOs
  | 'founders'        // Startup founders, solopreneurs
  | 'managers'        // Team leads, department heads
  | 'individual_contributors' // ICs: developers, designers, marketers
  | 'recruiters_hr'   // Talent acquisition, people ops
  | 'investors_vcs'   // Angels, partners, LPs
  | 'general_professionals'; // Broad audience

// Research configuration — the full input model
export interface TrendResearchConfig {
  keyword: string;
  contentTypeTarget: ContentTypeTarget;
  topicType: TopicType;
  audienceSegment: AudienceSegment;
  industryVertical: string;        // "SaaS", "FinTech", "Healthcare", etc.
  timeframe: 'today 7-d' | 'today 1-m' | 'today 3-m' | 'today 12-m';
  geo: string;                     // ISO country code, default 'US'
  personaId?: string;              // From Personas tab
  isBtoB: boolean;
  competitorContext?: string;      // Competitor LinkedIn URL or brand name
  existingContentContext?: string; // What they've already written about
  customResearchDirective?: string; // Freetext steer
  compareWith?: string;            // Second keyword for comparison
  researchDepth: 'quick' | 'deep';
}

export type HookFormula =
  | 'question' | 'contrarian' | 'statistic' | 'story' | 'bold_claim'
  | 'how_to' | 'listicle';

export interface ContentBrief {
  headline: string;
  angle: string;
  openingHook: string;
  keyPoints: string[];
  uniqueDataAngle: string;
  ctaType: string;
  recommendedFormat: ContentTypeTarget;
  whyItWins: string;
}

// Typed content gap — extends the backend ContentGap
export interface TypedContentGap {
  id: string;
  type: 'angle' | 'format' | 'audience' | 'recency' | 'data' | 'depth';
  title: string;
  problem: string;
  opportunity: string;
  priorityScore: number;           // 0-100
  suggestedContentType: ContentTypeTarget;
  suggestedHookFormula: HookFormula;
  suggestedHashtags: string[];
  estimatedEngagementLift: string;
  competitionLevel: 'low' | 'medium' | 'high';
  openingHook?: string;           // Pre-generated hook line
  contentBrief?: ContentBrief;   // Full brief if available
}

// Enhanced opportunity score result
export interface EnhancedOpportunityScore {
  overallScore: number;
  opportunityLevel: 'Useless' | 'Meh' | 'Good' | 'Goldmine';
  velocity: 'dying' | 'cooling' | 'stable' | 'rising' | 'exploding';
  isPeaking: boolean;
  bestContentType: ContentTypeTarget;
  bestAudienceAngle: string;
  estimatedEngagementScore: number;  // 0-100
  hashtagRecommendations: string[];
  factors: {
    trendMomentum: number;
    communityInterest: number;
    contentGapSize: number;
    b2bRelevance: number;
  };
  recommendation: string;
  isDataReal: boolean;
}

// Editorial calendar item
export interface CalendarItem {
  week: number;
  contentIdea: string;
  format: ContentTypeTarget;
  hook: string;
  targetAudience: AudienceSegment;
  priorityScore: number;
}

// Compliance rule
export interface ComplianceRule {
  id: string;
  label: string;
  status: 'pass' | 'warn' | 'fail';
  action?: { label: string; handler: () => void };
}

// Topic watchlist item
export interface WatchlistItem {
  id: string;
  keyword: string;
  contentType?: ContentTypeTarget;
  topicType?: TopicType;
  audienceSegment?: AudienceSegment;
  alertThreshold: number;
  isActive: boolean;
  lastChecked?: string;
  createdAt: string;
  latestScore?: number;
  latestVelocity?: string;
}

export const INDUSTRY_VERTICALS = [
  'SaaS', 'FinTech', 'Healthcare', 'E-commerce', 'Dev Tools', 'AI/ML', 'HR Tech',
  'Marketing', 'Sales', 'Consulting', 'Legal', 'Education', 'Climate/ESG',
  'Cybersecurity', 'Data Analytics', 'Cloud Infrastructure', 'PropTech', 'InsurTech',
];

export const GEO_OPTIONS = [
  { code: 'US', label: '🇺🇸 United States' },
  { code: 'GB', label: '🇬🇧 United Kingdom' },
  { code: 'IN', label: '🇮🇳 India' },
  { code: 'DE', label: '🇩🇪 Germany' },
  { code: 'AU', label: '🇦🇺 Australia' },
  { code: 'CA', label: '🇨🇦 Canada' },
  { code: 'SG', label: '🇸🇬 Singapore' },
  { code: '', label: '🌐 Global' },
];

export const CONTENT_TYPE_BADGES: Record<ContentTypeTarget, string> = {
  post: '3,000 chars · 3-5 hashtags · 210-char hook window',
  carousel: 'Caption 3,000 chars · 3-5 hashtags · 7-15 slides',
  article: 'Long-form · 0-3 hashtags · Google-indexed',
  poll: 'Question 140 chars · 2-4 options · 3-5 hashtags',
};

export const TOPIC_TYPE_META: Record<TopicType, { icon: string; label: string; desc: string }> = {
  thought_leadership: { icon: '💡', label: 'Thought Leadership', desc: 'Original takes & frameworks' },
  industry_news: { icon: '📰', label: 'Industry News', desc: 'Commentary on current events' },
  how_to: { icon: '🛠️', label: 'How-To', desc: 'Step-by-step guides' },
  career_professional: { icon: '👔', label: 'Career/Professional', desc: 'Workplace, hiring, culture' },
  data_insights: { icon: '📊', label: 'Data & Insights', desc: 'Stats, research, benchmarks' },
  case_study: { icon: '🏆', label: 'Case Study', desc: 'Real wins, losses, stories' },
  product_launch: { icon: '🚀', label: 'Product Launch', desc: 'Tools, announcements, reviews' },
  community_question: { icon: '🗳️', label: 'Community Question', desc: 'Polls, surveys, debates' },
};
