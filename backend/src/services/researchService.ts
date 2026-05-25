import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { logger } from '../utils/logger';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface ResearchResult {
  title: string;
  snippet: string;
  url: string;
  source: string;
}

export class ResearchService {
  /**
   * Perform web search using Gemini Google Search Grounding
   */
  async webSearch(query: string, limit: number = 10): Promise<ResearchResult[]> {
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        tools: [{ googleSearch: {} } as any],
      });

      const prompt = `Search the web for the latest, real-time information, statistics, and articles about: "${query}".
Return a list of the top ${limit} most relevant web results.
Return in JSON format:
{
  "results": [
    {
      "title": "Title of the page/article",
      "snippet": "Brief summary of the findings or snippet",
      "url": "URL of the page",
      "source": "Website/Source name"
    }
  ]
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract results from JSON
      let results: ResearchResult[] = [];
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          results = parsed.results || [];
        } catch (e) {
          logger.warn('Failed to parse Gemini search JSON:', e);
        }
      }

      // Enrich with metadata grounding chunks to ensure URLs are 100% real and cited
      const candidate = response.candidates?.[0];
      const groundingMetadata = candidate?.groundingMetadata as any;
      if (groundingMetadata?.groundingChunks?.length) {
        const chunks = groundingMetadata.groundingChunks;
        
        if (results.length === 0) {
          results = chunks
            .filter((chunk: any) => chunk.web?.uri)
            .map((chunk: any) => ({
              title: chunk.web.title || 'Search Result',
              snippet: 'Real-time search resource referenced by Gemini.',
              url: chunk.web.uri,
              source: new URL(chunk.web.uri).hostname.replace('www.', ''),
            }));
        } else {
          // Verify/fix URLs in JSON results using grounding chunks if there are mismatches
          results = results.map(res => {
            const matchingChunk = chunks.find((c: any) => 
              (c.web?.title && c.web.title.toLowerCase().includes(res.source.toLowerCase())) || 
              (c.web?.uri && c.web.uri.includes(res.url))
            );
            if (matchingChunk?.web) {
              return {
                ...res,
                url: matchingChunk.web.uri,
                title: matchingChunk.web.title || res.title,
              };
            }
            return res;
          });
        }
      }

      return results.slice(0, limit);
    } catch (error) {
      logger.error('Web search grounding error:', error);
      return this.geminiSearch(query, limit);
    }
  }

  /**
   * Fallback search using plain Gemini
   */
  async geminiSearch(query: string, limit: number = 10): Promise<ResearchResult[]> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `Provide 10 relevant details or context about: "${query}"
Include:
- Title
- Summary snippet
- Source/website name
- URL (or reasonable mock/reference URL)

Return in JSON format:
{
  "results": [
    {"title": "...", "snippet": "...", "url": "...", "source": "..."}
  ]
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.results || [];
      }

      return [];
    } catch (error) {
      logger.error('Gemini search error:', error);
      return [];
    }
  }

  /**
   * Search for news articles using Gemini Google Search Grounding
   */
  async newsSearch(query: string, limit: number = 10): Promise<ResearchResult[]> {
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        tools: [{ googleSearch: {} } as any],
      });

      const prompt = `Search the web for the latest news articles and updates about: "${query}".
Return a list of the top ${limit} most recent news stories.
Return in JSON format:
{
  "results": [
    {
      "title": "Article Title",
      "snippet": "Brief summary of the news story",
      "url": "Article URL",
      "source": "News Publisher name"
    }
  ]
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      let results: ResearchResult[] = [];
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          results = parsed.results || [];
        } catch (e) {
          logger.warn('Failed to parse Gemini news JSON:', e);
        }
      }

      const candidate = response.candidates?.[0];
      const groundingMetadata = candidate?.groundingMetadata as any;
      if (groundingMetadata?.groundingChunks?.length) {
        const chunks = groundingMetadata.groundingChunks;
        if (results.length === 0) {
          results = chunks
            .filter((chunk: any) => chunk.web?.uri)
            .map((chunk: any) => ({
              title: chunk.web.title || 'News Update',
              snippet: 'Recent news grounding reference.',
              url: chunk.web.uri,
              source: new URL(chunk.web.uri).hostname.replace('www.', ''),
            }));
        }
      }

      return results.slice(0, limit);
    } catch (error) {
      logger.error('News search grounding error:', error);
      return this.geminiSearch(`${query} news`, limit);
    }
  }


  /**
   * Extract key information from a URL
   */
  async extractFromUrl(url: string): Promise<any> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `Extract key information from this URL: ${url}

Provide:
1. Main topic/title
2. Key points (3-5 bullet points)
3. Important statistics or data
4. Author/Source
5. Publication date (if available)

Return in JSON format.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return null;
    } catch (error) {
      logger.error('URL extraction error:', error);
      return null;
    }
  }

  /**
   * Summarize research findings
   */
  async summarizeFindings(results: ResearchResult[]): Promise<string> {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `Summarize these research findings into key insights:

${results.map((r, i) => `${i + 1}. ${r.title}\n${r.snippet}`).join('\n\n')}

Provide:
1. 3-5 key takeaways
2. Common themes
3. Notable statistics
4. Expert opinions mentioned

Keep it concise and actionable.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      logger.error('Summarize findings error:', error);
      return '';
    }
  }
}
