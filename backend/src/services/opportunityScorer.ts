import { TopicResearchResult } from './topicResearchOrchestrator';
import { GapAnalysisResult } from './linkedinContentGapAnalyzer';

export interface OpportunityScorecard {
  overallScore: number;         // 0-100
  opportunityLevel: 'Useless' | 'Meh' | 'Good' | 'Goldmine';
  factors: {
    trendMomentum: number;      // 0-100
    communityInterest: number;  // 0-100
    contentGapSize: number;     // 0-100
    b2bRelevance: number;       // 0-100
  };
  recommendation: string;
  isDataReal: boolean;          // true if based on real signals, false if purely hallucinated
}

export class OpportunityScorer {
  score(research: TopicResearchResult, gaps: GapAnalysisResult): OpportunityScorecard {
    // 1. Trend Momentum (30%)
    const trendMomentum = research.trendScore + Math.min(25, Math.max(0, research.velocity7d));
    const normalizedTrend = Math.min(100, Math.max(0, trendMomentum));

    // 2. Community Interest (25%)
    // Base it on real Reddit posts if available, otherwise penalize
    let communityInterest = 30; // Default low for AI hallucinations
    if (research.redditSignal.isDataReal) {
      // 10 posts a week is considered "hot" for a B2B niche
      communityInterest = Math.min(100, research.redditSignal.weeklyPostCount * 10);
    }

    // 3. Content Gap Size (25%)
    // Based on how many unsaturated gaps we found
    let gapScore = 0;
    if (gaps.topGaps.length > 0) {
      // Average uniqueness of top gaps (invert competitor score)
      const avgUniqueness = gaps.topGaps.reduce((acc, g) => acc + g.uniquenessScore, 0) / gaps.topGaps.length;
      const avgLowCompetition = gaps.topGaps.reduce((acc, g) => acc + (100 - g.competitorScore), 0) / gaps.topGaps.length;
      gapScore = (avgUniqueness + avgLowCompetition) / 2;
    }

    // 4. B2B Relevance (20%)
    // Estimated from the quality of verified sources (HBR, McKinsey, etc. boost this)
    let b2bRelevance = 50; // Default
    if (research.verifiedSources.length > 0) {
      const highCredCount = research.verifiedSources.filter(s => s.credibility === 'high').length;
      b2bRelevance = Math.min(100, 50 + (highCredCount * 10));
    }

    // Calculate Overall Score
    const overallScore = Math.round(
      (normalizedTrend * 0.30) +
      (communityInterest * 0.25) +
      (gapScore * 0.25) +
      (b2bRelevance * 0.20)
    );

    let opportunityLevel: 'Useless' | 'Meh' | 'Good' | 'Goldmine';
    let recommendation: string;

    if (overallScore >= 80) {
      opportunityLevel = 'Goldmine';
      recommendation = 'Drop everything and write about this now. High trend momentum with massive content gaps.';
    } else if (overallScore >= 60) {
      opportunityLevel = 'Good';
      recommendation = 'Solid topic. Focus on the specific gaps identified to stand out.';
    } else if (overallScore >= 40) {
      opportunityLevel = 'Meh';
      recommendation = 'Over-saturated or low interest. Only write if you have a highly contrarian take.';
    } else {
      opportunityLevel = 'Useless';
      recommendation = 'Do not waste time writing about this. No one cares right now.';
    }

    return {
      overallScore,
      opportunityLevel,
      factors: {
        trendMomentum: Math.round(normalizedTrend),
        communityInterest: Math.round(communityInterest),
        contentGapSize: Math.round(gapScore),
        b2bRelevance: Math.round(b2bRelevance),
      },
      recommendation,
      isDataReal: research.isFullyGrounded,
    };
  }
}
