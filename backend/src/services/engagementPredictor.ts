import { FormatAuditResult, LinkedInFormatter } from '../utils/linkedinFormatter';

export interface PredictionResult {
  score: number; // 0-100
  estimatedImpressionsMin: number;
  estimatedImpressionsMax: number;
  engagementRate: number; // e.g., 4.5%
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  feedback: string[];
}

export class EngagementPredictor {
  /**
   * Predict post engagement metrics based on formatting, hook, keyword research quality, and topic signal
   */
  static predict(
    body: string,
    contentType: string,
    researchQuality: number = 50,
    firstComment?: string
  ): PredictionResult {
    // 1. Run formatting audit
    const audit = LinkedInFormatter.auditPost(body, contentType, firstComment);
    
    // 2. Base score from formatting compliance (60% weight)
    let score = audit.score * 0.6;
    
    // 3. Add weight from research/grounding quality (40% weight)
    score += researchQuality * 0.4;
    
    // Ensure boundaries
    score = Math.max(0, Math.min(100, Math.round(score)));

    // 4. Calculate engagement rate and impressions based on score
    // Higher score -> higher impressions
    const baseImpressions = contentType === 'poll' ? 800 : contentType === 'carousel' ? 1200 : 500;
    const factor = score / 50; // multiplier around 0-2x
    
    const estimatedImpressionsMin = Math.round(baseImpressions * factor);
    const estimatedImpressionsMax = Math.round(baseImpressions * factor * 2.5);
    
    // Engagement rate predictions (ranges from 1.5% to 8.5%)
    const engagementRate = parseFloat((1.5 + (score / 100) * 7.0).toFixed(1));

    // Grade classification
    let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'C';
    if (score >= 90) grade = 'A';
    else if (score >= 75) grade = 'B';
    else if (score >= 60) grade = 'C';
    else if (score >= 45) grade = 'D';
    else grade = 'F';

    // Collect feedback messages from audit
    const feedback: string[] = audit.checks
      .filter(c => !c.passed)
      .map(c => c.message);

    if (researchQuality < 60) {
      feedback.push('Improve research grounding: Fetch more verified references to boost B2B credibility.');
    }

    return {
      score,
      estimatedImpressionsMin,
      estimatedImpressionsMax,
      engagementRate,
      grade,
      feedback: feedback.length > 0 ? feedback : ['Your content is optimized for top performance!']
    };
  }
}
