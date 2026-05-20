// Content Studio — Per-content-type output schemas
// These are the structured JSON contracts that each specialised writing agent must return.

export type HookFormula =
  | 'question'
  | 'contrarian'
  | 'statistic'
  | 'story'
  | 'bold_claim';

export type PollDuration = '1_day' | '3_days' | '1_week' | '2_weeks';

export type CTAType = 'comment' | 'share' | 'dm' | 'visit_link' | 'follow';

// ── Post ──

export interface PostOutput {
  title: string;
  body: string;                    // ≤ 3,000 chars
  hook: string;                    // First 210 chars (the hook window content)
  hashtags: string[];              // 3–5 items
  firstComment: string;            // Link + extra hashtags
  hookFormula: HookFormula;
  charCount: number;
  emojiCount: number;
}

// ── Carousel ──

export interface CarouselSlide {
  slideNumber: number;
  type: 'cover' | 'content' | 'cta';
  headline: string;                // ≤ 150 chars
  body: string;                    // ≤ 300 chars; bullet points preferred
  speakerNotes?: string;
}

export interface CarouselOutput {
  caption: string;                 // The text post accompanying the PDF (≤ 3,000)
  captionHashtags: string[];       // 3–5 for caption
  slides: CarouselSlide[];         // 7–12 slides
  firstComment: string;
}

// ── Article ──

export interface ArticleSection {
  heading: string;
  content: string;
}

export interface ArticleOutput {
  title: string;                   // ≤ 100 chars (SEO window)
  excerpt: string;                 // First 200 chars; secondary hook
  body: string;                    // Full markdown with H2/H3 headings
  sections: ArticleSection[];
  coverImagePrompt: string;
  hashtags: string[];              // 0–3
  readingTimeMinutes: number;
  wordCount: number;
}

// ── Poll ──

export interface PollOption {
  text: string;                    // ≤ 30 chars
  order: number;
}

export interface PollOutput {
  question: string;                // ≤ 140 chars
  options: PollOption[];           // 2–4 items
  duration: PollDuration;
  introText: string;               // Post body above the poll (≤ 3,000)
  introHashtags: string[];         // 3–5
  firstComment: string;            // Creator's answer + CTA
}

// ── Character limits reference ──

export const LINKEDIN_LIMITS = {
  post: { maxChars: 3000, hookWindow: 210, optimalChars: 1400 },
  carousel: { maxCaptionChars: 3000, hookWindow: 210, minSlides: 5, maxSlides: 15, headlineMaxChars: 150, bodyMaxChars: 300 },
  article: { maxChars: 110000, titleMaxChars: 100, excerptMaxChars: 200, optimalWords: 1500 },
  poll: { questionMaxChars: 140, optionMaxChars: 30, minOptions: 2, maxOptions: 4, introMaxChars: 3000 },
} as const;
