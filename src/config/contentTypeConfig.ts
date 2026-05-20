import { Sparkles, BookOpen, Lightbulb } from 'lucide-react';

export type HookFormula =
  | 'question'
  | 'contrarian'
  | 'statistic'
  | 'story'
  | 'bold_claim';

export type PollDuration = '1_day' | '3_days' | '1_week' | '2_weeks';

export type CTAType = 'comment' | 'share' | 'dm' | 'visit_link' | 'follow' | 'save';

export interface ContentTypeConfig {
  id: string;
  label: string;
  icon: any;
  description: string;
  charLimit: number;
  charSoftLimit: number;       // Optimal ceiling
  hookWindowChars: number;     // Characters visible before "See More"
  hashtagRange: [number, number];
  emojiMax: number;
  showSlideCount: boolean;
  showPollFields: boolean;
  showArticleFields: boolean;
  defaultPrompt: string;
  hookFormulas?: HookFormula[];
  ctaOptions?: CTAType[];
  tips: string[];
}

export const CONTENT_TYPE_CONFIGS: Record<string, ContentTypeConfig> = {
  post: {
    id: 'post',
    label: 'LinkedIn Post',
    icon: Sparkles,
    description: 'Punchy storytelling text post designed for native reach',
    charLimit: 3000,
    charSoftLimit: 1400,
    hookWindowChars: 210,
    hashtagRange: [3, 5],
    emojiMax: 3,
    showSlideCount: false,
    showPollFields: false,
    showArticleFields: false,
    hookFormulas: ['question', 'contrarian', 'statistic', 'story', 'bold_claim'],
    ctaOptions: ['comment', 'share', 'dm', 'visit_link', 'follow'],
    defaultPrompt: `Write a storytelling-style post. Start with an intriguing question or statement.
Use short, punchy paragraphs (max 3 lines each, blank line between every paragraph).
Emphasize a key lesson. Finish with an open-ended question to spark discussion.
Total: 800–1,400 characters. NO links in the body.`,
    tips: [
      'First 210 characters are your hook window — make them count',
      'Links in the body reduce reach ~40% — put them in the first comment',
      '3–5 hashtags at the very end',
      '"I" voice outperforms brand voice 3:1',
    ],
  },
  carousel: {
    id: 'carousel',
    label: 'Carousel / Slides',
    icon: BookOpen,
    description: 'Slide-deck PDF outline optimized for swipes and saves',
    charLimit: 3000,        // Caption limit
    charSoftLimit: 1200,
    hookWindowChars: 210,
    hashtagRange: [3, 5],   // In caption, not slides
    emojiMax: 2,
    showSlideCount: true,
    showPollFields: false,
    showArticleFields: false,
    ctaOptions: ['comment', 'share', 'follow', 'save'],
    defaultPrompt: `Create a 10-slide LinkedIn carousel. 
Slide 1 (Cover): Bold promise headline ≤ 100 chars.
Slides 2–9 (Content): Each slide = one idea. Headline ≤ 150 chars. 3 bullets max, each ≤ 100 chars.
Slide 10 (CTA): Follow + save + comment ask.
Caption: Compelling text post (800–1,200 chars) that teases the content without spoiling it.`,
    tips: [
      '7–12 slides = optimal; cover + content + CTA structure',
      'Each slide = exactly ONE idea',
      'Zero hashtags on the slides themselves — hashtags go in the caption',
      'The caption is treated as a regular post — hook it strongly',
    ],
  },
  article: {
    id: 'article',
    label: 'Article',
    icon: BookOpen,
    description: 'Long-form newsletter or article post indexed by Google SEO',
    charLimit: 110000,
    charSoftLimit: 15000,
    hookWindowChars: 200,   // Article excerpt shown in feed
    hashtagRange: [0, 3],
    emojiMax: 0,
    showSlideCount: false,
    showPollFields: false,
    showArticleFields: true,
    ctaOptions: ['comment', 'follow', 'dm'],
    defaultPrompt: `Write a professional LinkedIn article.
Title: ≤ 100 chars with primary keyword.
Structure: H2 subheading every 200–300 words.
Length: 1,200–2,500 words.
Include 2–3 external source links.
End with a strong conclusion and CTA.
Tone: authoritative but accessible; first person "I" voice.`,
    tips: [
      'Title ≤ 100 chars — this is what appears in Google Search',
      'External links are allowed in articles — no reach penalty',
      'H2 subheadings every 200–300 words improve dwell time',
      '0–3 hashtags at the end; articles rank by keyword, not hashtag',
    ],
  },
  poll: {
    id: 'poll',
    label: 'Interactive Poll',
    icon: Lightbulb,
    description: 'Question with multiple choice options to boost click-through feedback',
    charLimit: 3000,        // Intro text limit
    charSoftLimit: 800,
    hookWindowChars: 210,
    hashtagRange: [3, 5],
    emojiMax: 2,
    showSlideCount: false,
    showPollFields: true,
    showArticleFields: false,
    ctaOptions: ['comment', 'share', 'follow'],
    defaultPrompt: `Create a LinkedIn poll.
Poll question: ≤ 140 characters — clear, debate-worthy question.
Options: exactly 4 options, each ≤ 30 characters.
Intro text: Set up the debate (500–800 chars). Share your opinion. End with "Vote below 👇".
First comment: Reveal your own answer and ask others to explain their vote.`,
    tips: [
      'Poll question hard limit: 140 characters',
      'Each option hard limit: 30 characters',
      'Binary yes/no polls drive the highest response rates',
      'Always reveal your own answer in the first comment',
    ],
  },
};

export const PHASE_LABELS: Record<number, string> = {
  0: 'Researching your topic across the web...',
  1: 'Analysing trends and competitor content...',
  2: 'Crafting your SEO strategy and hooks...',
  3: 'Writing your LinkedIn content...',
  4: 'Editing and fact-checking...',
  5: 'Optimising engagement and timing...',
};
