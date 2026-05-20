import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface ArticleFieldsProps {
  articleTitle: string;
  onArticleTitleChange: (val: string) => void;
  articleTargetWords: number;
  onArticleTargetWordsChange: (val: number) => void;
}

export const ArticleFields: React.FC<ArticleFieldsProps> = ({
  articleTitle,
  onArticleTitleChange,
  articleTargetWords,
  onArticleTargetWordsChange,
}) => {
  const charLimit = 100;
  const titleLength = articleTitle.length;
  const isOverLimit = titleLength > charLimit;

  // Auto-calculations
  const readingTime = Math.max(1, Math.ceil(articleTargetWords / 200));
  const subheadings = Math.max(2, Math.ceil(articleTargetWords / 250));

  return (
    <div className="space-y-6">
      {/* Article Title */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label htmlFor="article-title-input" className="text-sm font-semibold">
            Article Title (Optional)
          </Label>
          <span
            className={cn(
              'text-xs font-mono font-semibold',
              isOverLimit ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            {titleLength} / {charLimit}
          </span>
        </div>
        <Input
          id="article-title-input"
          type="text"
          placeholder="e.g., The Ultimate Guide to Scaling B2B Lead Gen in 2026"
          value={articleTitle}
          onChange={(e) => onArticleTitleChange(e.target.value)}
          maxLength={120} // Allow typing slightly over to show warning
          className={cn(
            'bg-card border-border',
            isOverLimit && 'border-destructive focus-visible:ring-destructive'
          )}
        />
        <p className="text-[10px] text-muted-foreground">
          💡 A compelling SEO title ensures the article indexes well on search engines.
        </p>
      </div>

      {/* Target Word Count */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Label className="text-sm font-semibold">Target Word Count</Label>
          <span className="text-xs font-mono bg-secondary px-2 py-0.5 rounded font-medium text-foreground">
            {articleTargetWords.toLocaleString()} words
          </span>
        </div>
        <div className="pt-2">
          <Slider
            id="article-words-slider"
            value={[articleTargetWords]}
            min={200}
            max={4000}
            step={100}
            onValueChange={(val) => onArticleTargetWordsChange(val[0])}
          />
        </div>
        
        {/* Dynamic calculation tags */}
        <div className="flex gap-4 p-3 bg-secondary/35 rounded-lg border border-border/80 text-xs">
          <div className="space-y-0.5">
            <div className="text-muted-foreground">Estimated Read Time</div>
            <div className="font-semibold text-foreground font-mono">~{readingTime} minutes</div>
          </div>
          <div className="w-px bg-border/80" />
          <div className="space-y-0.5">
            <div className="text-muted-foreground">Suggested H2 Subheadings</div>
            <div className="font-semibold text-foreground font-mono">~{subheadings} sections</div>
          </div>
          <div className="w-px bg-border/80" />
          <div className="space-y-0.5">
            <div className="text-muted-foreground">Complexity Index</div>
            <div className="font-semibold text-foreground font-mono">
              {articleTargetWords < 800 ? 'Quick Read' : articleTargetWords < 2000 ? 'Standard Deep-dive' : 'Whitepaper'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
