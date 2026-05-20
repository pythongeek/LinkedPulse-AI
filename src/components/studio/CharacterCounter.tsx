import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CharacterCounterProps {
  value: string;
  limit: number;
  softLimit?: number;
  hookWindowChars?: number;
  showHookWindow?: boolean;
  label?: string;
  id?: string;
}

export const CharacterCounter: React.FC<CharacterCounterProps> = ({
  value = '',
  limit,
  softLimit,
  hookWindowChars = 210,
  showHookWindow = false,
  label = 'Characters',
  id,
}) => {
  const count = value.length;
  const isOverHard = count > limit;
  const isOverSoft = softLimit ? count > softLimit : false;

  // Percentage of progress (max out at 100%)
  const percentage = Math.min((count / limit) * 100, 100);

  // Determine color status
  let statusColor = 'bg-primary'; // default blue/purple theme
  let textColor = 'text-muted-foreground';

  if (isOverHard) {
    statusColor = 'bg-destructive';
    textColor = 'text-destructive';
  } else if (isOverSoft) {
    statusColor = 'bg-amber-500';
    textColor = 'text-amber-500';
  }

  // Hook window preview (first N characters)
  const hookPreview = value.substring(0, hookWindowChars);
  const remainingInHook = value.substring(hookWindowChars);

  return (
    <div id={id} className="space-y-2 w-full">
      <div className="flex justify-between items-center text-sm font-medium">
        <span className="text-sm text-foreground/80">{label}</span>
        <div className="flex items-center gap-2">
          {softLimit && (
            <span className="text-xs text-muted-foreground">
              (optimal ≤ {softLimit})
            </span>
          )}
          <span className={cn('font-mono font-semibold', textColor)}>
            {count.toLocaleString()} <span className="text-muted-foreground font-normal">/ {limit.toLocaleString()}</span>
          </span>
        </div>
      </div>

      <div className="relative">
        <Progress value={percentage} className="h-2 w-full bg-secondary" />
        {/* Render indicator line for soft limit if defined */}
        {softLimit && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-500/50 cursor-help"
            style={{ left: `${(softLimit / limit) * 100}%` }}
            title={`Optimal soft limit: ${softLimit} characters`}
          />
        )}
      </div>

      <div className="flex flex-wrap gap-2 items-center justify-end">
        {isOverHard && (
          <Badge variant="destructive" className="font-semibold text-xs animate-pulse">
            {(count - limit).toLocaleString()} characters over limit!
          </Badge>
        )}
        {!isOverHard && isOverSoft && (
          <Badge variant="outline" className="text-amber-500 border-amber-500 bg-amber-500/10 font-semibold text-xs">
            Over optimal length
          </Badge>
        )}
      </div>

      {showHookWindow && value.length > 0 && (
        <div className="mt-4 p-3 bg-secondary/35 rounded-lg border border-dashed border-border/80">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
            <Eye className="w-3.5 h-3.5" />
            <span>LinkedIn Scroll-Stopping Preview (Mobile Fold)</span>
          </div>
          <p className="text-sm font-sans leading-relaxed break-words whitespace-pre-wrap">
            <span className="bg-primary/10 border-b border-primary/30 text-foreground font-medium px-0.5 rounded">
              {hookPreview}
            </span>
            {remainingInHook && (
              <span className="opacity-45 select-none select-all-none cursor-not-allowed">
                ... [see more]
              </span>
            )}
          </p>
          <div className="text-[10px] text-muted-foreground/70 mt-2 italic">
            Highlighted section is visible on feed. Keep the core outcome or hook within this window (210 chars).
          </div>
        </div>
      )}
    </div>
  );
};
