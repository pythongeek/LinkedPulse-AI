import React, { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { ShieldCheck, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContentHealthScoreProps {
  content: string;
  contentType: string;
  charLimit: number;
  hashtagRange: [number, number];
  emojiMax: number;
  hookWindowChars: number;
}

export const ContentHealthScore: React.FC<ContentHealthScoreProps> = ({
  content = '',
  contentType,
  charLimit,
  hashtagRange,
  emojiMax,
  hookWindowChars,
}) => {
  // Memoize expensive score calculations (regex matching, string splitting)
  // to prevent running them on every parent re-render when content hasn't changed.
  const {
    charScore, charTip,
    hookScore, hookTip,
    formatScore, formatTip,
    hashtagScore, hashtagTip,
    emojiScore, emojiTip,
    ctaScore, ctaTip,
    overallScore
  } = useMemo(() => {
    // 1. Character Optimization
    const count = content.length;
    let cScore = 100;
    let cTip = 'Optimal length achieved.';

    if (count === 0) {
      cScore = 0;
      cTip = 'Write some content first.';
    } else if (count > charLimit) {
      cScore = 0;
      cTip = `Over the hard limit of ${charLimit} characters! Truncate.`;
    } else {
      // Soft limits
      const softLimit = contentType === 'post' ? 1400 : contentType === 'carousel' ? 1200 : contentType === 'poll' ? 800 : 15000;
      if (count > softLimit) {
        const excess = count - softLimit;
        const deduction = Math.min(50, Math.floor((excess / softLimit) * 50));
        cScore = 100 - deduction;
        cTip = `Optimal is ≤ ${softLimit} chars. Truncating by ~${excess} chars will increase read completion.`;
      }
    }

    // 2. Hook Strength
    let hScore = 100;
    let hTip = 'Great scroll-stopping hook.';
    const hookText = content.substring(0, hookWindowChars);
    
    if (hookText.length === 0) {
      hScore = 0;
      hTip = 'No hook detected.';
    } else if (hookText.length < 50) {
      hScore = 40;
      hTip = 'Hook is too short to build context or curiosity.';
    } else {
      // Check patterns
      const hasQuestion = hookText.includes('?') || hookText.includes('Why') || hookText.includes('How');
      const hasNumbers = /\d+/.test(hookText);
      const hasStory = hookText.includes('I') || hookText.includes('years ago') || hookText.includes('ago');
      const endsWithColon = hookText.trim().endsWith(':');

      let patternsMatched = 0;
      if (hasQuestion) patternsMatched++;
      if (hasNumbers) patternsMatched++;
      if (hasStory) patternsMatched++;
      if (endsWithColon) patternsMatched++;

      if (patternsMatched === 0) {
        hScore = 65;
        hTip = 'Add a question, statistic, or end the hook with a colon (:) to prompt curiosity.';
      } else if (patternsMatched === 1) {
        hScore = 85;
        hTip = 'Solid hook. Try adding a specific metric or number to increase trust.';
      }
    }

    // 3. Line Break Formatting
    let fScore = 100;
    let fTip = 'Excellent spacing, very readable on mobile.';
    const paragraphs = content.split('\n\n').filter(Boolean);

    if (paragraphs.length === 0) {
      fScore = 0;
      fTip = 'No paragraphs found.';
    } else {
      let denseParagraphCount = 0;
      let singleLineCount = 0;

      paragraphs.forEach((p) => {
        const lines = p.split('\n').length;
        if (lines > 3) denseParagraphCount++;
        if (lines === 1) singleLineCount++;
      });

      if (denseParagraphCount > 0) {
        fScore = Math.max(20, 100 - (denseParagraphCount * 25));
        fTip = 'Break up paragraphs longer than 3 lines. Dense blocks hurt reader dwell time.';
      } else if (singleLineCount === paragraphs.length && paragraphs.length > 5) {
        fScore = 85;
        fTip = 'Vary sentence structures. Too many single-sentence lines can read like generic spam.';
      }
    }

    // 4. Hashtag Compliance
    const hashtagCount = (content.match(/#\w+/g) || []).length;
    const [minHash, maxHash] = hashtagRange;
    let htScore = 100;
    let htTip = 'Perfect hashtag count.';

    if (hashtagCount < minHash) {
      htScore = Math.max(30, 100 - ((minHash - hashtagCount) * 20));
      htTip = `LinkedIn works best with ${minHash}-${maxHash} hashtags. Add ${minHash - hashtagCount} more at the bottom.`;
    } else if (hashtagCount > maxHash) {
      htScore = Math.max(30, 100 - ((hashtagCount - maxHash) * 15));
      htTip = `Excessive hashtags suppress impressions. Remove ${hashtagCount - maxHash} hashtags.`;
    }

    // 5. Emoji Usage
    const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
    const emojisUsed = (content.match(emojiRegex) || []);
    const emojiCount = emojisUsed.length;
    let eScore = 100;
    let eTip = 'Great balance of visual emojis.';

    if (emojiCount > emojiMax) {
      const excess = emojiCount - emojiMax;
      eScore = Math.max(40, 100 - (excess * 15));
      eTip = `Max recommended emojis is ${emojiMax}. Remove ${excess} emojis to keep a professional tone.`;
    } else if (emojiCount === 0 && contentType !== 'article') {
      eScore = 80;
      eTip = 'Add 1-2 emojis to break up dry text walls (e.g., in headers or first hook lines).';
    }

    // 6. CTA Quality
    let cScore2 = 100;
    let cTip2 = 'Strong action-oriented call to action.';

    if (paragraphs.length > 0) {
      const lastParagraph = paragraphs[paragraphs.length - 1].toLowerCase();
      const ctaKeywords = ['comment', 'vote', 'link', 'check', 'share', 'follow', 'thoughts', 'dm', 'let me know', '?'];
      const hasCTA = ctaKeywords.some((word) => lastParagraph.includes(word));

      if (!hasCTA) {
        cScore2 = 40;
        cTip2 = 'Add an ending question or call to action to boost engagement feedback.';
      }
    } else {
      cScore2 = 0;
      cTip2 = 'No CTA found.';
    }

    // Overall Weighted Score
    const oScore = Math.round(
      cScore * 0.2 +
      hScore * 0.25 +
      fScore * 0.2 +
      htScore * 0.1 +
      eScore * 0.1 +
      cScore2 * 0.15
    );

    return {
      charScore: cScore, charTip: cTip,
      hookScore: hScore, hookTip: hTip,
      formatScore: fScore, formatTip: fTip,
      hashtagScore: htScore, hashtagTip: htTip,
      emojiScore: eScore, emojiTip: eTip,
      ctaScore: cScore2, ctaTip: cTip2,
      overallScore: oScore
    };
  }, [content, contentType, charLimit, hashtagRange, emojiMax, hookWindowChars]);

  const getScoreColorClass = (score: number) => {
    if (score >= 90) return 'text-green-500 bg-green-500/10 border-green-500/20';
    if (score >= 70) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    return 'text-destructive bg-destructive/10 border-destructive/20';
  };

  const getBarColorClass = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 70) return 'bg-amber-500';
    return 'bg-destructive';
  };

  const metrics = [
    { label: 'Scroll-stopping Hook', score: hookScore, tip: hookTip },
    { label: 'Mobile-friendly Spacing', score: formatScore, tip: formatTip },
    { label: 'Character Optimization', score: charScore, tip: charTip },
    { label: 'CTA & Question Strength', score: ctaScore, tip: ctaTip },
    { label: 'Hashtag Optimization', score: hashtagScore, tip: hashtagTip },
    { label: 'Emoji budget balance', score: emojiScore, tip: emojiTip },
  ];

  return (
    <div className="border border-border/80 bg-card rounded-xl p-5 space-y-6 text-foreground text-left">
      <div className="flex items-center justify-between border-b border-border/60 pb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5.5 h-5.5 text-primary" />
          <h3 className="font-bold text-sm tracking-wide uppercase">LinkedIn Algorithm Health Score</h3>
        </div>
        <div className={cn('px-3.5 py-1.5 rounded-full border text-lg font-mono font-bold flex items-center gap-1.5 shadow-sm', getScoreColorClass(overallScore))}>
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Score:</span>
          <span>{overallScore}/100</span>
        </div>
      </div>

      <div className="space-y-4">
        {metrics.map((metric, i) => (
          <div key={i} className="space-y-1.5 group">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-foreground/80">{metric.label}</span>
              <span className="font-mono text-muted-foreground">{metric.score}%</span>
            </div>
            <Progress value={metric.score} className="h-1.5 bg-secondary" indicatorClassName={getBarColorClass(metric.score)} />
            <p className="text-[10px] text-muted-foreground leading-normal group-hover:text-foreground transition-colors pt-0.5">
              💡 {metric.tip}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
