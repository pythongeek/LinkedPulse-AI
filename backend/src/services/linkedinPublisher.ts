import axios from 'axios';
import { logger } from '../utils/logger';
import { PdfGeneratorService } from './pdfGenerator';

export class LinkedInPublisher {
  /**
   * Fetch the author's URN from the /v2/me endpoint
   */
  static async getAuthorUrn(accessToken: string): Promise<string> {
    try {
      const response = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      // The userinfo endpoint returns 'sub' which is the URN
      return `urn:li:person:${response.data.sub}`;
    } catch (error: any) {
      logger.error('Failed to get LinkedIn author URN', error.response?.data || error.message);
      
      // Fallback to /v2/me if userinfo fails (legacy)
      try {
        const meResponse = await axios.get('https://api.linkedin.com/v2/me', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        return `urn:li:person:${meResponse.data.id}`;
      } catch (meError: any) {
        throw new Error(`Could not fetch LinkedIn URN: ${meError.response?.data?.message || meError.message}`);
      }
    }
  }

  /**
   * Publish a text post to LinkedIn via modern Posts API
   */
  static async publishText(text: string, accessToken: string, authorUrn?: string): Promise<string> {
    try {
      const urn = authorUrn || await this.getAuthorUrn(accessToken);

      const payload = {
        author: urn,
        commentary: text,
        visibility: 'PUBLIC',
        distribution: {
          feedDistribution: 'MAIN_FEED'
        },
        lifecycleState: 'PUBLISHED',
      };

      const response = await axios.post('https://api.linkedin.com/rest/posts', payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'LinkedIn-Version': '202605',
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json',
        },
      });

      const postId = response.headers['x-restli-id'] || response.data?.id || '';
      return postId;
    } catch (error: any) {
      logger.error('Failed to publish text to LinkedIn', error.response?.data || error.message);
      throw new Error(`LinkedIn API Error: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Publish a comment to a LinkedIn post
   */
  static async publishComment(
    postUrn: string,
    commentText: string,
    accessToken: string,
    authorUrn?: string
  ): Promise<string> {
    try {
      const urn = authorUrn || await this.getAuthorUrn(accessToken);

      const payload = {
        actor: urn,
        object: postUrn,
        message: {
          text: commentText,
        },
      };

      const encodedPostUrn = encodeURIComponent(postUrn);
      const url = `https://api.linkedin.com/rest/socialActions/${encodedPostUrn}/comments`;

      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'LinkedIn-Version': '202605',
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json',
        },
      });

      const commentId = response.headers['x-restli-id'] || response.data?.id || '';
      return commentId;
    } catch (error: any) {
      logger.error('Failed to publish comment to LinkedIn', error.response?.data || error.message);
      throw new Error(`LinkedIn Comment API Error: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Register an image upload with LinkedIn modern Images API
   */
  static async registerImageUpload(accessToken: string, authorUrn?: string): Promise<{ uploadUrl: string; assetUrn: string }> {
    try {
      const urn = authorUrn || await this.getAuthorUrn(accessToken);

      const payload = {
        initializeUploadRequest: {
          owner: urn,
        },
      };

      const response = await axios.post('https://api.linkedin.com/rest/images?action=initializeUpload', payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'LinkedIn-Version': '202605',
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json',
        },
      });

      const uploadUrl = response.data.value.uploadUrl;
      const assetUrn = response.data.value.image;

      return { uploadUrl, assetUrn };
    } catch (error: any) {
      logger.error('Failed to register LinkedIn image upload', error.response?.data || error.message);
      throw new Error(`LinkedIn Assets API Error: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Upload image binary to the provided uploadUrl
   */
  static async uploadImageBinary(uploadUrl: string, imageBuffer: Buffer, accessToken: string): Promise<void> {
    try {
      await axios.put(uploadUrl, imageBuffer, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'image/jpeg',
        },
      });
    } catch (error: any) {
      logger.error('Failed to upload image binary to LinkedIn', error.response?.data || error.message);
      throw new Error(`LinkedIn Image Upload Error: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Publish a text post with an attached image via modern Posts API
   */
  static async publishImage(text: string, assetUrn: string, accessToken: string, authorUrn?: string): Promise<string> {
    try {
      const urn = authorUrn || await this.getAuthorUrn(accessToken);

      const payload = {
        author: urn,
        commentary: text,
        visibility: 'PUBLIC',
        distribution: {
          feedDistribution: 'MAIN_FEED'
        },
        content: {
          media: {
            id: assetUrn
          }
        },
        lifecycleState: 'PUBLISHED',
      };

      const response = await axios.post('https://api.linkedin.com/rest/posts', payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'LinkedIn-Version': '202605',
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json',
        },
      });

      const postId = response.headers['x-restli-id'] || response.data?.id || '';
      return postId;
    } catch (error: any) {
      logger.error('Failed to publish image post to LinkedIn', error.response?.data || error.message);
      throw new Error(`LinkedIn API Error: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Register a document upload with LinkedIn Documents API
   */
  static async registerDocumentUpload(accessToken: string, authorUrn?: string): Promise<{ uploadUrl: string; assetUrn: string }> {
    try {
      const urn = authorUrn || await this.getAuthorUrn(accessToken);

      const payload = {
        initializeUploadRequest: {
          owner: urn,
        },
      };

      const response = await axios.post('https://api.linkedin.com/rest/documents?action=initializeUpload', payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'LinkedIn-Version': '202605',
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json',
        },
      });

      const uploadUrl = response.data.value.uploadUrl;
      const assetUrn = response.data.value.document;

      return { uploadUrl, assetUrn };
    } catch (error: any) {
      logger.error('Failed to register LinkedIn document upload', error.response?.data || error.message);
      throw new Error(`LinkedIn Documents API Error: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Upload document binary to the provided uploadUrl
   */
  static async uploadDocumentBinary(uploadUrl: string, documentBuffer: Buffer, accessToken: string): Promise<void> {
    try {
      await axios.put(uploadUrl, documentBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
        },
      });
    } catch (error: any) {
      logger.error('Failed to upload document binary to LinkedIn', error.response?.data || error.message);
      throw new Error(`LinkedIn Document Upload Error: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Publish a document post via LinkedIn Posts API
   */
  static async publishDocument(text: string, assetUrn: string, documentTitle: string, accessToken: string, authorUrn?: string): Promise<string> {
    try {
      const urn = authorUrn || await this.getAuthorUrn(accessToken);

      // Poll document status until AVAILABLE
      let status = '';
      let attempts = 0;
      const maxAttempts = 15;
      while (status !== 'AVAILABLE' && attempts < maxAttempts) {
        // Wait 2 seconds between status checks
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          const statusResponse = await axios.get(`https://api.linkedin.com/rest/documents/${encodeURIComponent(assetUrn)}`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'LinkedIn-Version': '202605',
              'X-Restli-Protocol-Version': '2.0.0',
            }
          });
          status = statusResponse.data.status;
          logger.info(`Polling LinkedIn document status: ${status} (attempt ${attempts + 1}/${maxAttempts})`);
          if (status === 'PROCESSING_FAILED') {
            throw new Error('LinkedIn document processing failed');
          }
        } catch (pollError: any) {
          logger.error('Error polling LinkedIn document status', pollError.response?.data || pollError.message);
        }
        attempts++;
      }

      if (status !== 'AVAILABLE') {
        throw new Error('LinkedIn document processing timed out or failed to become AVAILABLE');
      }

      const payload = {
        author: urn,
        commentary: text,
        visibility: 'PUBLIC',
        distribution: {
          feedDistribution: 'MAIN_FEED'
        },
        content: {
          media: {
            id: assetUrn,
            title: documentTitle
          }
        },
        lifecycleState: 'PUBLISHED'
      };

      const response = await axios.post('https://api.linkedin.com/rest/posts', payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'LinkedIn-Version': '202605',
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json',
        },
      });

      const postId = response.headers['x-restli-id'];
      if (!postId) {
        logger.warn('LinkedIn posts API did not return x-restli-id header, attempting response data fallback');
        return response.data?.id || '';
      }
      return postId;
    } catch (error: any) {
      logger.error('Failed to publish document post to LinkedIn', error.response?.data || error.message);
      throw new Error(`LinkedIn Posts API Error: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Cleans raw markdown markers that won't render properly on LinkedIn
   */
  static cleanMarkdownForLinkedIn(text: string): string {
    if (!text) return '';
    return text
      // Replace markdown bold **text** or __text__ with text
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      // Replace markdown italic *text* or _text_ with text
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      // Replace inline code `code` with code
      .replace(/`([^`]+)`/g, '$1')
      // Replace markdown headers (e.g. "# Header") with just the text
      .replace(/^[ \t]*#{1,6}\s+([^\n]+)/gm, '$1')
      // Replace blockquotes (e.g., "> Text") with just the text
      .replace(/^[ \t]*>\s+([^\n]+)/gm, '$1');
  }

  /**
   * Format and publish a complete content record to LinkedIn
   */
  static async publishContentRecord(content: any, accessToken: string, logger: any, authorUrn?: string): Promise<string> {
    // Determine the text to publish
    let textToPublish = content.body || content.content || '';
    if (textToPublish === 'undefined') {
      textToPublish = '';
    }

    textToPublish = this.cleanMarkdownForLinkedIn(textToPublish);

    // Format poll
    if (content.contentType === 'poll' && content.pollQuestion) {
      const options = content.pollOptions as any;
      let optionsText = '';
      if (Array.isArray(options)) {
        const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
        optionsText = options
          .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
          .map((opt: any, index: number) => {
            const emoji = numberEmojis[index] || '🔹';
            return `${emoji} ${opt.text}`;
          })
          .join('\n');
      }
      const prefix = textToPublish.trim() ? `${textToPublish}\n\n` : '';
      textToPublish = `${prefix}📊 POLL:\n❓ ${content.pollQuestion}\n\n${optionsText}\n\n👇 Vote by replying with your choice in the comments!`;
    }

    let postUrn = '';

    // Handle Carousel / PDF Generation
    if (content.contentType === 'carousel') {
      let slidesList = content.slides as any;
      
      // Safe parsing if slides are stored as a stringified JSON array
      if (typeof slidesList === 'string') {
        try {
          slidesList = JSON.parse(slidesList);
        } catch (_) {}
      }
      
      // Safe double-parsing if double-stringified
      if (typeof slidesList === 'string') {
        try {
          slidesList = JSON.parse(slidesList);
        } catch (_) {}
      }

      // Safe recursive extraction of slides array
      const findSlidesArray = (obj: any): any[] | null => {
        if (Array.isArray(obj)) return obj;
        if (obj && typeof obj === 'object') {
          // Prioritize specific fields
          if (Array.isArray(obj.slides)) return obj.slides;
          if (Array.isArray(obj.slideDeck)) return obj.slideDeck;
          if (Array.isArray(obj.data)) return obj.data;
          // Recursively find the first array in other fields
          for (const key of Object.keys(obj)) {
            const result = findSlidesArray(obj[key]);
            if (result) return result;
          }
        }
        return null;
      };

      const extractedSlides = findSlidesArray(slidesList);
      if (extractedSlides && extractedSlides.length > 0) {
        slidesList = extractedSlides;
      }

      if (!Array.isArray(slidesList) || slidesList.length === 0) {
        throw new Error('LinkedIn Carousel requires at least one slide. Try generating or recreating the slide content.');
      }

      try {
          const defaultTheme = {
            primaryColor: '#0284C7',
            backgroundColor: '#F8FAFC',
            textColor: '#0F172A',
            accentColor: '#64748B',
            authorName: 'LinkedPulse AI',
            authorHandle: '@linkedpulse'
          };
          
          let theme = defaultTheme;
          if (content.linkedinOptimization && typeof content.linkedinOptimization === 'object') {
            const opt = content.linkedinOptimization as any;
            if (opt.theme) {
              theme = {
                primaryColor: opt.theme.primaryColor || defaultTheme.primaryColor,
                backgroundColor: opt.theme.backgroundColor || defaultTheme.backgroundColor,
                textColor: opt.theme.textColor || defaultTheme.textColor,
                accentColor: opt.theme.accentColor || defaultTheme.accentColor,
                authorName: opt.theme.authorName || defaultTheme.authorName,
                authorHandle: opt.theme.authorHandle || defaultTheme.authorHandle,
              };
            }
          }

          const pdfBuffer = await PdfGeneratorService.generateCarouselPdf(slidesList, theme, content.title || 'Carousel');
          
          const { uploadUrl, assetUrn } = await this.registerDocumentUpload(accessToken, authorUrn);
          await this.uploadDocumentBinary(uploadUrl, pdfBuffer, accessToken);
          
          postUrn = await this.publishDocument(textToPublish, assetUrn, content.title || 'Document Content Deck', accessToken, authorUrn);
        } catch (pdfError: any) {
          logger.error('Failed to generate or upload PDF carousel', pdfError);
          const errMsg = pdfError.response?.data?.message || pdfError.response?.data?.error?.message || pdfError.message;
          throw new Error(`LinkedIn Carousel Upload Failed: ${errMsg}`);
        }
    }

    if (!postUrn) {
      if (!textToPublish.trim()) {
        throw new Error('Content body is empty');
      }

      const hasImage = Array.isArray(content.images) && content.images.length > 0 && typeof content.images[0] === 'string' && content.images[0].trim() !== '';

      if (hasImage && content.contentType !== 'carousel') {
        try {
          const imageUrlOrBase64 = (content.images as string[])[0];
          let imageBuffer: Buffer;
          
          if (imageUrlOrBase64.startsWith('data:image')) {
            const base64Data = imageUrlOrBase64.split(',')[1];
            imageBuffer = Buffer.from(base64Data, 'base64');
          } else {
            const imageRes = await axios.get(imageUrlOrBase64, { responseType: 'arraybuffer' });
            imageBuffer = Buffer.from(imageRes.data);
          }

          const { uploadUrl, assetUrn } = await this.registerImageUpload(accessToken, authorUrn);
          await this.uploadImageBinary(uploadUrl, imageBuffer, accessToken);
          postUrn = await this.publishImage(textToPublish, assetUrn, accessToken, authorUrn);
        } catch (imageUploadError) {
          logger.error('Failed to upload and publish image, falling back to text post', imageUploadError);
          postUrn = await this.publishText(textToPublish, accessToken, authorUrn);
        }
      } else {
        postUrn = await this.publishText(textToPublish, accessToken, authorUrn);
      }
    }

    if (content.firstComment) {
      try {
        const commentText = this.cleanMarkdownForLinkedIn(content.firstComment);
        await this.publishComment(postUrn, commentText, accessToken, authorUrn);
        logger.info(`Strategic first comment published automatically for post: ${postUrn}`);
      } catch (commentError) {
        logger.error(`Failed to publish automatic first comment for ${postUrn}:`, commentError);
      }
    }

    return postUrn;
  }

  /**
   * Fetch all LinkedIn Pages (Organizations) the user administers
   */
  static async getManagedOrganizations(accessToken: string): Promise<Array<{ urn: string, name: string }>> {
    try {
      // 1. Get Organizational Entity ACLs (Pages the user has a role on)
      const aclResponse = await axios.get('https://api.linkedin.com/rest/organizationAcls?q=roleAssignee', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'LinkedIn-Version': '202605',
          'X-Restli-Protocol-Version': '2.0.0',
        },
      });

      const elements = aclResponse.data.elements || [];
      const adminOrgs = elements
        .filter((el: any) => el.role === 'ADMINISTRATOR' && el.state === 'APPROVED')
        .map((el: any) => el.organization);

      if (adminOrgs.length === 0) return [];

      // Extract organization IDs (e.g., from "urn:li:organization:12345" -> "12345")
      const orgIds = adminOrgs.map((urn: string) => urn.split(':').pop());

      // 2. Fetch the display names for these organizations
      const idsParam = orgIds.join(',');
      const orgResponse = await axios.get(`https://api.linkedin.com/rest/organizations?ids=List(${idsParam})`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'LinkedIn-Version': '202605',
          'X-Restli-Protocol-Version': '2.0.0',
        },
      });

      const organizations = [];
      const results = orgResponse.data.results || {};
      
      for (const id in results) {
        organizations.push({
          urn: `urn:li:organization:${id}`,
          name: results[id].localizedName || 'Unknown Page',
        });
      }

      return organizations;
    } catch (error: any) {
      logger.error('Failed to fetch managed organizations', error.response?.data || error.message);
      throw new Error(`LinkedIn Org API Error: ${error.response?.data?.message || error.message}`);
    }
  }
}
