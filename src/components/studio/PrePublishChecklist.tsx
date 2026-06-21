import React, { useMemo } from 'react';
import { AlertCircle, CheckCircle2, Info, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PrePublishChecklistProps {
  content: string;
  contentType: string;
  charLimit: number;
  hashtagRange: [number, number];
}

export const PrePublishChecklist: React.FC<PrePublishChecklistProps> = ({
  content = '',
  contentType,
  charLimit,
  hashtagRange,
}) => {
  const checks = useMemo(() => {
    const count = content.length;
    const paragraphs = content.split('\n\n').filter(Boolean);

    // 1. Character limit check
    const charLimitPass = count <= charLimit && count > 0;

    // 2. Hashtags count check
    const hashtags = content.match(/#\w+/g) || [];
    const hashtagCount = hashtags.length;
    const [minHash, maxHash] = hashtagRange;
    const hashtagsPass = hashtagCount >= minHash && hashtagCount <= maxHash;

    // 3. Links check (only post/poll/carousel captions should avoid body links)
    const hasLinksInBody = /https?:\/\/[^\s]+/.test(content);
    const linksPass = contentType === 'article' ? true : !hasLinksInBody;

    // 4. Hook Window Sentence boundary check (first 210 chars)
    const hookWindowText = content.substring(0, 210);
    const hasGoodBoundary =
      hookWindowText.includes('\n') ||
      hookWindowText.includes('.') ||
      hookWindowText.includes('!') ||
      hookWindowText.includes('?');
    const hookPass = count > 0 ? hasGoodBoundary : true;

    // 5. Spacing check (line counts)
    let spacingPass = true;
    paragraphs.forEach((p) => {
      const lines = p.split('\n').length;
      if (lines > 3) spacingPass = false;
    });

    // 6. CTA check
    let ctaPass = false;
    if (paragraphs.length > 0) {
      const lastParagraph = paragraphs[paragraphs.length - 1].toLowerCase();
      const ctaKeywords = ['comment', 'vote', 'link', 'check', 'share', 'follow', 'thoughts', 'dm', 'let me know', '?'];
      ctaPass = ctaKeywords.some((word) => lastParagraph.includes(word));
    }

    return [
      {
        id: 'char-limit',
        label: `Character count within limit (${count.toLocaleString()} / ${charLimit.toLocaleString()})`,
        status: charLimitPass ? 'pass' : 'fail',
        errorMsg: 'Exceeds the maximum character limit allowed by LinkedIn.',
      },
      {
        id: 'hashtag-count',
        label: `Optimal hashtag count (${hashtagCount} used, target: ${minHash}-${maxHash})`,
        status: hashtagsPass ? 'pass' : 'warn',
        warnMsg: hashtagCount < minHash ? `Add ${minHash - hashtagCount} more hashtags.` : `Remove ${hashtagCount - maxHash} hashtags to boost distribution.`,
      },
      {
        id: 'body-links',
        label: 'No external links in post body',
        status: linksPass ? 'pass' : 'fail',
        errorMsg: 'Links in body suppress reach ~40%. Move the link to the First Comment tab.',
      },
      {
        id: 'hook-fold',
        label: 'Hook ends cleanly before see more line-fold',
        status: hookPass ? 'pass' : 'warn',
        warnMsg: 'Ensure the first sentence or curiosity gap fits within the 210 character fold.',
      },
      {
        id: 'spacing',
        label: 'Paragraphs are mobile-friendly (≤3 lines each)',
        status: spacingPass ? 'pass' : 'warn',
        warnMsg: 'Break up longer paragraphs to prevent readers from scrolling past walls of text.',
      },
      {
        id: 'cta-exists',
        label: 'Engagement prompt/CTA in final paragraph',
        status: ctaPass ? 'pass' : 'warn',
        warnMsg: 'Add a question or conversion instructions at the end to prompt comments.',
      },
    ];
  }, [content, contentType, charLimit, hashtagRange]);

  return (
    <div className="border border-border/80 bg-card rounded-xl p-5 space-y-4 text-foreground text-left shadow-inner">
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <HelpCircle className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-sm tracking-wide uppercase">Pre-Publish Checklist</h3>
      </div>

      <div className="space-y-3.5">
        {checks.map((check) => (
          <div key={check.id} className="flex gap-2.5 items-start text-xs leading-normal">
            {check.status === 'pass' && (
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
            )}
            {check.status === 'warn' && (
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            )}
            {check.status === 'fail' && (
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            )}
            
            <div className="space-y-0.5">
              <span className={cn(
                'font-medium text-foreground/90',
                check.status === 'fail' && 'text-foreground font-semibold'
              )}>
                {check.label}
              </span>
              {check.status === 'warn' && check.warnMsg && (
                <p className="text-[10px] text-amber-500/90 font-medium font-sans">
                  ⚠️ {check.warnMsg}
                </p>
              )}
              {check.status === 'fail' && check.errorMsg && (
                <p className="text-[10px] text-destructive/90 font-semibold font-sans">
                  ❌ {check.errorMsg}
                </p>
              )}
            </div>
          </div>
        ))}

        {/* Strategic publishing tip */}
        <div className="p-3 bg-secondary/35 rounded-lg border border-border/80 text-[10px] flex gap-2 items-start mt-2">
          <Info className="w-4.5 h-4.5 text-primary flex-shrink-0" />
          <div className="space-y-0.5">
            <span className="font-bold text-foreground">PRO TIP FOR LAUNCH DAY</span>
            <p className="text-muted-foreground leading-relaxed">
              Post the content first. Within 60 seconds, copy and post your strategic first comment. This anchors it at the top and ensures your call-to-actions are fully visible.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
