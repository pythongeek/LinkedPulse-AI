import { z } from 'zod';

// Persona validation schema
export const personaSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  jobRole: z.string().min(1, 'Job role is required').max(200),
  expertiseNodes: z.array(z.string()).min(1, 'At least one expertise is required'),
  experienceVault: z.string().max(5000, 'Experience vault too long'),
  tone: z.enum(['analytical', 'provocative', 'friendly', 'professional', 'casual', 'inspirational']),
  visualDNA: z.object({
    style: z.enum(['minimalist', 'tech', 'corporate', 'creative', 'bold']),
    colorScheme: z.string(),
    aesthetics: z.string(),
  }),
  isDefault: z.boolean().optional(),
});

// Content generation validation schema
export const contentGenerationSchema = z.object({
  topic: z.string().min(1, 'Topic is required').max(500),
  contentType: z.enum(['post', 'carousel', 'article', 'poll']),
  personaId: z.string().uuid().optional(),
  outline: z.object({
    sections: z.array(z.object({
      title: z.string(),
      points: z.array(z.string()),
    })).optional(),
  }).optional(),
  researchDepth: z.enum(['quick', 'deep']).default('quick'),
  includeImages: z.boolean().default(true),
});

// Trend analysis validation schema
export const trendAnalysisSchema = z.object({
  keywords: z.array(z.string().min(1)).min(1).max(5),
  timeframe: z.enum(['today 1-m', 'today 3-m', 'today 12-m', 'all']).default('today 3-m'),
  geo: z.string().default('US'),
});

// LinkedIn cookies validation schema
export const linkedinCookiesSchema = z.object({
  liAt: z.string().min(10, 'Invalid li_at cookie'),
  jsessionId: z.string().min(5, 'Invalid JSESSIONID'),
});

// Competitor analysis validation schema
export const competitorAnalysisSchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  depth: z.enum(['quick', 'deep']).default('quick'),
  postLimit: z.number().min(10).max(100).default(50),
});

// Profile audit validation schema
export const profileAuditSchema = z.object({
  linkedinUrl: z.string().url('Invalid LinkedIn URL'),
  industry: z.string().min(1, 'Industry is required'),
  focusAreas: z.array(z.string()).optional(),
});

// Image generation validation schema
export const imageGenerationSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(1000),
  style: z.enum(['professional', 'creative', 'minimal', 'tech', 'bold']).default('professional'),
  count: z.number().min(1).max(4).default(1),
  aspectRatio: z.enum(['1:1', '16:9', '4:3', '9:16']).default('16:9'),
});

// Research validation schema
export const researchSchema = z.object({
  query: z.string().min(1, 'Query is required').max(500),
  sources: z.array(z.enum(['web', 'news', 'scholar'])).default(['web']),
  limit: z.number().min(1).max(20).default(10),
});

// User registration validation schema
export const userRegistrationSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100),
});

// User login validation schema
export const userLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Type exports
export type PersonaInput = z.infer<typeof personaSchema>;
export type ContentGenerationInput = z.infer<typeof contentGenerationSchema>;
export type TrendAnalysisInput = z.infer<typeof trendAnalysisSchema>;
export type LinkedInCookiesInput = z.infer<typeof linkedinCookiesSchema>;
export type CompetitorAnalysisInput = z.infer<typeof competitorAnalysisSchema>;
export type ProfileAuditInput = z.infer<typeof profileAuditSchema>;
export type ImageGenerationInput = z.infer<typeof imageGenerationSchema>;
export type ResearchInput = z.infer<typeof researchSchema>;
