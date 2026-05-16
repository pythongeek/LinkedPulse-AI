export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  linkedinConnected: boolean;
  defaultPersona: Persona | null;
  usageStats: UsageStats;
}

export interface Persona {
  id: string;
  name: string;
  jobRole: string;
  expertiseNodes: string[];
  experienceVault: string;
  tone: 'analytical' | 'provocative' | 'friendly' | 'professional' | 'casual' | 'inspirational';
  visualDNA: {
    style: 'minimalist' | 'tech' | 'corporate' | 'creative' | 'bold';
    colorScheme: string;
    aesthetics: string;
  };
  isDefault: boolean;
  createdAt: string;
}

export interface UsageStats {
  contentsGenerated: number;
  topicsResearched: number;
  imagesCreated: number;
  apiCalls: number;
  lastReset: string;
}

export interface Content {
  id: string;
  contentType: 'post' | 'carousel' | 'article' | 'poll';
  title: string;
  body: string;
  outline: any;
  researchData: any;
  sources: any[];
  images: string[];
  status: 'draft' | 'scheduled' | 'published';
  engagementPrediction: number;
  scheduledFor: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export interface TrendData {
  keyword: string;
  interestOverTime: Array<{ date: string; value: number }>;
  relatedQueries: {
    rising: Array<{ query: string; value: number }>;
    top: Array<{ query: string; value: number }>;
  };
  regionalInterest: Array<{ region: string; value: number }>;
  trendScore: number;
}

export interface OpportunityScore {
  score: number;
  breakdown: {
    trendMomentum: number;
    searchVolume: number;
    competition: number;
    engagement: number;
  };
  recommendation: string;
}

export interface CompetitorAnalysis {
  totalPosts: number;
  avgEngagement: {
    likes: number;
    comments: number;
    shares: number;
  };
  topPerformers: any[];
  contentPatterns: any;
  contentGaps: string[];
  opportunities: string[];
}

export interface ProfileAudit {
  id: string;
  overallScore: number;
  seoScore: number;
  brandScore: number;
  headlineAnalysis: any;
  aboutAnalysis: any;
  bannerAnalysis: any;
  gaps: string[];
  suggestions: any[];
  topCreators: any[];
  industryTrends: any;
  createdAt: string;
}

export interface Alert {
  id: string;
  topic: string;
  alertType: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ContentSuggestion {
  title: string;
  angle: string;
  outline: any;
  format: string;
  targetAudience: string;
}
