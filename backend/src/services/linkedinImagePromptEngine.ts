import { Persona } from '@prisma/client';

// LinkedIn-specific image dimensions (official specs)
export const LINKEDIN_IMAGE_SPECS = {
  feed_post:      { width: 1200, height: 627,  ratio: '1.91:1', desc: 'Standard feed post' },
  carousel_cover: { width: 1080, height: 1080, ratio: '1:1',    desc: 'Carousel cover slide' },
  carousel_slide: { width: 1080, height: 1080, ratio: '1:1',    desc: 'Carousel content slide' },
  banner:         { width: 1584, height: 396,  ratio: '4:1',    desc: 'Profile/company banner' },
  article_cover:  { width: 1920, height: 1080, ratio: '16:9',   desc: 'Article header image' },
  profile_photo:  { width: 400,  height: 400,  ratio: '1:1',    desc: 'Profile photo crop' },
} as const;

export type ImagePurpose = keyof typeof LINKEDIN_IMAGE_SPECS;

// LinkedIn content policy constraints (safe, professional)
const LINKEDIN_SAFE_CONSTRAINTS = [
  'no human faces',
  'no stock photo clichés (no handshakes, no pointing at whiteboards, no generic team photos)',
  'no text overlay (will be added separately in design tool)',
  'no logos or brand marks',
  'professional and business-appropriate',
  'no political imagery',
  'no personal identifiable information visible',
  'no clocks or calendars',
];

// Style vocabulary mapped from persona visualDNA
const STYLE_VOCABULARY: Record<string, string> = {
  minimalist:   'clean white space, simple geometric shapes, minimal elements, sans-serif influence, breathing room, Dieter Rams aesthetic',
  tech:         'dark background, circuit board patterns, isometric 3D elements, cool blue/purple/cyan palette, futuristic grid lines, data center aesthetic',
  corporate:    'professional photography style, neutral corporate colors (navy, slate, warm white), conservative composition, editorial quality',
  creative:     'bold color blocks, dynamic diagonal composition, asymmetric layout, high contrast, editorial magazine feel, Pentagram-studio quality',
  bold:         'high contrast, oversized graphic elements, strong typography-inspired shapes, dramatic side lighting, poster-art quality',
  warm:         'earthy tones, organic shapes, soft gradients, human-scale objects, approachable and welcoming atmosphere',
  data_driven:  'clean data visualization aesthetic, charts and graphs as visual elements, analytical layout, information design quality',
};

// Hook formula to visual mood mapping
const HOOK_TO_VISUAL_MOOD: Record<string, string> = {
  statistic:   'data visualization aesthetic with abstract chart elements in background, analytical clean layout, numbers-inspired composition',
  story:       'warm editorial photography feel, human-scale everyday objects, narrative sequential composition, golden hour lighting mood',
  contrarian:  'tension-creating split design with two opposing visual elements, bold contrast between left and right halves',
  question:    'open negative space with visual curiosity elements, incomplete or open-ended geometric forms, inviting exploration',
  bold_claim:  'single powerful central element at maximum visual weight, declarative symmetrical composition, manifesto-poster style',
  listicle:    'grid or tile layout aesthetic, organized visual elements, systematic clean arrangement',
  how_to:      'step-by-step visual progression, flowing directional arrows or dots, process diagram aesthetic',
};

// Topic to visual concept mapping (avoids abstract → bad image generation)
const TOPIC_VISUAL_MAPPINGS: Array<[RegExp, string]> = [
  [/ai|artificial intelligence|machine learning|llm/i, 'neural network visualization with glowing nodes and connections on dark background'],
  [/leadership|management|ceo|exec/i, 'compass pointing north on minimal executive desk with strategic objects'],
  [/growth|scaling|revenue|sales/i, 'upward trending curve integrated into abstract minimal landscape, momentum'],
  [/innovation|disruption/i, 'light bulb deconstructed into geometric shapes, being reassembled'],
  [/data|analytics|metrics|kpi/i, 'clean data visualization dashboard with bars and trend lines on dark background'],
  [/team|collaboration|culture|hr/i, 'abstract interlocking geometric pieces in harmonious arrangement, puzzle metaphor'],
  [/strategy|planning|roadmap/i, 'chess piece on minimal board, strategic positioning with path visualization'],
  [/marketing|brand|content/i, 'megaphone icon deconstructed into flowing geometric brand elements'],
  [/productivity|efficiency|workflow/i, 'clean organized workspace with geometric workflow system objects'],
  [/career|job|hiring|recruitment/i, 'upward staircase of geometric steps in brand palette with opportunity metaphor'],
  [/startup|founder|entrepreneurship/i, 'rocket made of geometric shapes launching from minimal launchpad'],
  [/finance|investment|funding|money/i, 'abstract bar chart with upward trajectory, financial growth visualization'],
  [/technology|software|saas|product/i, 'clean user interface wireframe elements floating in organized digital space'],
  [/health|wellness|burnout/i, 'balance scale or plant growing, organic shapes with calming palette'],
  [/diversity|inclusion|dei/i, 'abstract diverse geometric shapes coexisting harmoniously, rich varied color palette'],
  [/remote|work from home|distributed/i, 'home office elements integrated with professional workspace, connected nodes'],
];

export interface StructuredImagePrompt {
  primaryPrompt: string;
  negativePrompt: string;
  styleModifiers: string;
  spec: typeof LINKEDIN_IMAGE_SPECS[ImagePurpose];
  purpose: ImagePurpose;
  campaignSeed: string;
  aspectRatio: string;
}

export class LinkedInImagePromptEngine {
  /**
   * Build a complete, LinkedIn-optimised, persona-aware image prompt.
   */
  buildPrompt(
    topic: string,
    purpose: ImagePurpose,
    persona?: Persona | null,
    contentBody?: string,
    hookFormula?: string,
    campaignId?: string
  ): StructuredImagePrompt {
    const spec = LINKEDIN_IMAGE_SPECS[purpose];
    const visualDNA = persona?.visualDNA as any;

    // 1. Core subject — topic → concrete visual concept
    const visualSubject = this.topicToVisualConcept(topic);

    // 2. Style from persona DNA or default
    const styleKey = visualDNA?.style || 'minimalist';
    const styleBase = STYLE_VOCABULARY[styleKey] || STYLE_VOCABULARY.minimalist;

    // 3. Color palette from persona or professional default
    const colorPalette = visualDNA?.colorScheme
      ? `color palette: ${visualDNA.colorScheme}`
      : 'color palette: deep navy #0A1628, crisp white #FFFFFF, and a single electric blue accent #2563EB';

    // 4. Hook → visual mood
    const moodModifier = hookFormula && HOOK_TO_VISUAL_MOOD[hookFormula]
      ? HOOK_TO_VISUAL_MOOD[hookFormula]
      : 'professional and compelling visual composition with clear focal point';

    // 5. Format-specific composition
    const compositionRule = this.getCompositionRule(purpose);

    // 6. Campaign coherence seed — same seed = visual consistency across a campaign
    const campaignSeed = campaignId
      ? `visual-campaign-${campaignId}`
      : `campaign-${topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}`;

    // 7. Assemble primary prompt (ordered for best model weight)
    const primaryPrompt = [
      `LinkedIn ${purpose.replace(/_/g, ' ')} professional image`,
      visualSubject,
      styleBase,
      colorPalette,
      moodModifier,
      compositionRule,
      'ultra-high quality digital illustration',
      '4K resolution, crisp details, premium B2B visual',
      'suitable for professional LinkedIn B2B audience',
    ].filter(Boolean).join(', ');

    // 8. Negative prompt — safety + quality enforcement
    const negativePrompt = [
      ...LINKEDIN_SAFE_CONSTRAINTS,
      'watermark',
      'signature',
      'blurry',
      'low resolution',
      'amateur photography',
      'busy cluttered composition',
      'nsfw',
      'cartoon',
      'anime',
      'childish',
      'ugly',
      'distorted',
    ].join(', ');

    return {
      primaryPrompt,
      negativePrompt,
      styleModifiers: `${styleBase}, ${colorPalette}`,
      spec,
      purpose,
      campaignSeed,
      aspectRatio: spec.ratio,
    };
  }

  /**
   * Convert abstract topic string to concrete imageable visual concept.
   */
  private topicToVisualConcept(topic: string): string {
    for (const [pattern, visual] of TOPIC_VISUAL_MAPPINGS) {
      if (pattern.test(topic)) return visual;
    }
    // Default: abstract professional representation
    return `abstract professional visualization representing the concept of ${topic}, geometric shapes, minimal design, premium feel`;
  }

  /**
   * Format-specific composition rules.
   */
  private getCompositionRule(purpose: ImagePurpose): string {
    const rules: Record<ImagePurpose, string> = {
      feed_post:      'landscape orientation 1.91:1 ratio, centered subject, rule of thirds, wide horizontal composition optimized for LinkedIn feed scroll',
      carousel_cover: 'bold centered composition, perfect square 1:1 format, strong single focal point, cover-slide hero design, invitation to swipe',
      carousel_slide: 'clean square layout, large generous white space areas on right or bottom for text overlay, consistent visual style with cover',
      banner:         'panoramic ultra-wide 4:1 banner, primary subject in left third, right two-thirds clear space for profile info',
      article_cover:  'cinematic 16:9 horizontal composition, editorial photography quality, high visual impact, newspaper header aesthetic',
      profile_photo:  'centered circular crop-safe composition, clean neutral background, professional headshot framing',
    };
    return rules[purpose] || rules.feed_post;
  }

  /**
   * Build coherent carousel image series maintaining visual identity.
   */
  buildCarouselPromptSeries(
    topic: string,
    slides: Array<{ slideNumber: number; type: string; headline: string }>,
    persona?: Persona | null
  ): StructuredImagePrompt[] {
    const campaignId = `${topic.slice(0, 20).replace(/[^a-z0-9]/gi, '-')}-carousel`;

    return slides.map((slide, index) => {
      const purpose: ImagePurpose = index === 0 ? 'carousel_cover' : 'carousel_slide';
      return this.buildPrompt(
        `${slide.headline} — ${topic}`,
        purpose,
        persona,
        slide.headline,
        undefined,
        campaignId  // same campaign ID = visual coherence across all slides
      );
    });
  }

  /**
   * Map contentType to LinkedIn image purpose.
   */
  static contentTypeToPurpose(contentType: string): ImagePurpose {
    const map: Record<string, ImagePurpose> = {
      carousel: 'carousel_cover',
      article:  'article_cover',
      post:     'feed_post',
      poll:     'feed_post',
    };
    return map[contentType] || 'feed_post';
  }
}
