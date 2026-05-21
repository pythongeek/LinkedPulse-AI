import axios from 'axios';
import { logger } from '../utils/logger';

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
   * Publish a text post to LinkedIn via UGC API
   */
  static async publishText(text: string, accessToken: string, authorUrn?: string): Promise<string> {
    try {
      const urn = authorUrn || await this.getAuthorUrn(accessToken);

      const payload = {
        author: urn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: text,
            },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      };

      const response = await axios.post('https://api.linkedin.com/v2/ugcPosts', payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json',
        },
      });

      return response.data.id; // Returns the URN of the published post
    } catch (error: any) {
      logger.error('Failed to publish to LinkedIn', error.response?.data || error.message);
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
        message: {
          text: commentText,
        },
      };

      const encodedPostUrn = encodeURIComponent(postUrn);
      const url = `https://api.linkedin.com/v2/socialActions/${encodedPostUrn}/comments`;

      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json',
        },
      });

      return response.data.id;
    } catch (error: any) {
      logger.error('Failed to publish comment to LinkedIn', error.response?.data || error.message);
      throw new Error(`LinkedIn Comment API Error: ${error.response?.data?.message || error.message}`);
    }
  }
  /**
   * Register an image upload with LinkedIn Assets API
   */
  static async registerImageUpload(accessToken: string, authorUrn?: string): Promise<{ uploadUrl: string; assetUrn: string }> {
    try {
      const urn = authorUrn || await this.getAuthorUrn(accessToken);

      const payload = {
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: urn,
          serviceRelationships: [
            {
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent',
            },
          ],
        },
      };

      const response = await axios.post('https://api.linkedin.com/v2/assets?action=registerUpload', payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json',
        },
      });

      const uploadUrl = response.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
      const assetUrn = response.data.value.asset;

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
          'Content-Type': 'application/octet-stream',
        },
      });
    } catch (error: any) {
      logger.error('Failed to upload image binary to LinkedIn', error.response?.data || error.message);
      throw new Error(`LinkedIn Image Upload Error: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Publish a text post with an attached image via UGC API
   */
  static async publishImage(text: string, assetUrn: string, accessToken: string, authorUrn?: string): Promise<string> {
    try {
      const urn = authorUrn || await this.getAuthorUrn(accessToken);

      const payload = {
        author: urn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: text,
            },
            shareMediaCategory: 'IMAGE',
            media: [
              {
                status: 'READY',
                description: {
                  text: 'Image',
                },
                media: assetUrn,
              },
            ],
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      };

      const response = await axios.post('https://api.linkedin.com/v2/ugcPosts', payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json',
        },
      });

      return response.data.id; // Returns the URN of the published post
    } catch (error: any) {
      logger.error('Failed to publish image post to LinkedIn', error.response?.data || error.message);
      throw new Error(`LinkedIn API Error: ${error.response?.data?.message || error.message}`);
    }
  }
}
