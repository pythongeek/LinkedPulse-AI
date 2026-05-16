import { Persona } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface PersonaData {
  name: string;
  jobRole: string;
  expertiseNodes: string[];
  experienceVault: string;
  tone: string;
  visualDNA: {
    style: string;
    colorScheme: string;
    aesthetics: string;
  };
}

export interface PersonaTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  defaultData: Partial<PersonaData>;
}

export class PersonaService {
  /**
   * Generate system prompt from persona data
   * This is the core of the Dynamic Persona Engine
   */
  static generateSystemPrompt(data: PersonaData): string {
    const expertiseText = data.expertiseNodes.join(', ');
    
    const toneInstructions: Record<string, string> = {
      analytical: 'Use data-driven insights and logical reasoning. Be precise and methodical in your explanations.',
      provocative: 'Challenge conventional thinking. Ask thought-provoking questions. Be bold and slightly controversial.',
      friendly: 'Write in a warm, approachable manner. Use conversational language and personal anecdotes.',
      professional: 'Maintain a polished, corporate tone. Use industry terminology appropriately.',
      casual: 'Be relaxed and informal. Use everyday language and humor when appropriate.',
      inspirational: 'Motivate and uplift. Share stories of success and overcoming challenges.',
    };

    const visualInstructions: Record<string, string> = {
      minimalist: 'Clean, simple designs with lots of whitespace. Focus on typography and subtle accents.',
      tech: 'Modern, futuristic aesthetics. Use gradients, dark backgrounds, and neon accents.',
      corporate: 'Professional, trustworthy look. Blue tones, clean lines, business-appropriate.',
      creative: 'Bold colors, unique layouts, artistic elements. Stand out from the crowd.',
      bold: 'High contrast, strong typography, impactful visuals. Make a statement.',
    };

    return `You are ${data.name}, a ${data.jobRole} with deep expertise in ${expertiseText}.

BACKGROUND & EXPERIENCE:
${data.experienceVault}

VOICE & TONE:
${toneInstructions[data.tone] || toneInstructions.professional}

VISUAL STYLE (for image generation):
${visualInstructions[data.visualDNA.style] || visualInstructions.minimalist}
Color Scheme: ${data.visualDNA.colorScheme}
Aesthetics: ${data.visualDNA.aesthetics}

CONTENT GUIDELINES:
- Write in first person as ${data.name}
- Never use generic corporate jargon or buzzwords
- Share specific insights from your expertise areas
- Include personal perspectives and lessons learned
- Cite sources when using statistics or research
- End with a clear call-to-action or thought-provoking question
- Optimize for LinkedIn engagement (hooks, formatting, readability)

When generating images, ensure they follow the visual style guidelines above.

Your goal is to create authentic, valuable content that reflects your unique expertise and perspective.`;
  }

  /**
   * Generate preview content for a persona
   */
  static async generatePreview(persona: Persona, sampleTopic: string): Promise<string> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const prompt = `${persona.systemPrompt}

Write a short LinkedIn post (150-200 words) about: "${sampleTopic}"

Make it engaging, authentic, and true to your voice. Include a hook and a call-to-action.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      logger.error('Error generating persona preview:', error);
      return 'Unable to generate preview at this time.';
    }
  }

  /**
   * Get persona templates
   */
  static getTemplates(): PersonaTemplate[] {
    return [
      {
        id: 'tech-founder',
        name: 'The Tech Founder',
        description: 'Visionary leader sharing startup insights and tech trends',
        icon: 'rocket',
        defaultData: {
          jobRole: 'Tech Entrepreneur & Startup Founder',
          tone: 'provocative',
          visualDNA: {
            style: 'tech',
            colorScheme: 'Dark blue, electric purple, neon accents',
            aesthetics: 'Modern, futuristic, innovative',
          },
        },
      },
      {
        id: 'industry-expert',
        name: 'The Industry Expert',
        description: 'Seasoned professional with deep domain knowledge',
        icon: 'award',
        defaultData: {
          jobRole: 'Senior Industry Consultant',
          tone: 'analytical',
          visualDNA: {
            style: 'corporate',
            colorScheme: 'Navy blue, silver, white',
            aesthetics: 'Professional, trustworthy, authoritative',
          },
        },
      },
      {
        id: 'creative-storyteller',
        name: 'The Creative Storyteller',
        description: 'Engaging narrator who brings ideas to life',
        icon: 'sparkles',
        defaultData: {
          jobRole: 'Creative Director & Storyteller',
          tone: 'inspirational',
          visualDNA: {
            style: 'creative',
            colorScheme: 'Warm oranges, deep reds, gold accents',
            aesthetics: 'Artistic, expressive, memorable',
          },
        },
      },
      {
        id: 'minimalist-thinker',
        name: 'The Minimalist Thinker',
        description: 'Clear, concise insights without the fluff',
        icon: 'minimize',
        defaultData: {
          jobRole: 'Strategy Consultant',
          tone: 'analytical',
          visualDNA: {
            style: 'minimalist',
            colorScheme: 'Black, white, subtle grays',
            aesthetics: 'Clean, simple, elegant',
          },
        },
      },
      {
        id: 'community-builder',
        name: 'The Community Builder',
        description: 'Warm, approachable leader focused on people',
        icon: 'users',
        defaultData: {
          jobRole: 'Community Lead & People Advocate',
          tone: 'friendly',
          visualDNA: {
            style: 'creative',
            colorScheme: 'Soft blues, greens, warm yellows',
            aesthetics: 'Welcoming, inclusive, human-centered',
          },
        },
      },
    ];
  }

  /**
   * Build context wrapper for AI requests
   * This implements the RAG approach for persona injection
   */
  static buildContextWrapper(persona: Persona, userContext?: Record<string, any>): string {
    const contextParts = [
      persona.systemPrompt,
    ];

    if (userContext) {
      contextParts.push(`\nUSER CONTEXT:\n${JSON.stringify(userContext, null, 2)}`);
    }

    return contextParts.join('\n\n---\n\n');
  }

  /**
   * Apply persona to content generation
   */
  static async applyPersonaToContent(
    persona: Persona,
    contentType: string,
    topic: string,
    outline?: any
  ): Promise<{ content: string; imagePrompts: string[] }> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const contextWrapper = this.buildContextWrapper(persona, {
        contentType,
        topic,
        outline,
      });

      const prompt = `${contextWrapper}

Create a ${contentType} about "${topic}".
${outline ? `Follow this outline: ${JSON.stringify(outline)}` : ''}

Requirements:
1. Write in your authentic voice as defined above
2. Include an engaging hook in the first line
3. Use proper LinkedIn formatting (line breaks, emojis where appropriate)
4. Include 3-5 key takeaways
5. End with a strong call-to-action
6. Suggest 2-3 image descriptions that match your visual style

Return your response in this JSON format:
{
  "content": "The full LinkedIn content",
  "imagePrompts": ["Description for image 1", "Description for image 2"]
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          content: parsed.content || text,
          imagePrompts: parsed.imagePrompts || [],
        };
      }

      return {
        content: text,
        imagePrompts: [],
      };
    } catch (error) {
      logger.error('Error applying persona to content:', error);
      return {
        content: 'Error generating content. Please try again.',
        imagePrompts: [],
      };
    }
  }
}
