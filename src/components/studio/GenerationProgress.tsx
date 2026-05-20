import React from 'react';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PHASE_LABELS } from '@/config/contentTypeConfig';

interface GenerationProgressProps {
  currentPhase: number;
  totalPhases?: number;
  isGenerating: boolean;
}

export const GenerationProgress: React.FC<GenerationProgressProps> = ({
  currentPhase,
  totalPhases = 6,
  isGenerating,
}) => {
  if (!isGenerating) return null;

  return (
    <div className="border border-border/80 bg-card rounded-xl p-5 space-y-6 text-foreground text-left shadow-inner">
      <div className="flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
        <div className="space-y-0.5">
          <h4 className="text-sm font-bold tracking-wide uppercase">AI Multi-Agent Collaboration Active</h4>
          <p className="text-xs text-muted-foreground">Each agent specializes in a distinct step of the LinkedIn optimization funnel.</p>
        </div>
      </div>

      {/* Progress Path */}
      <div className="relative flex justify-between items-center w-full px-2 pt-2">
        {/* Connection Line */}
        <div className="absolute left-6 right-6 top-[22px] h-[3px] bg-secondary -z-10 rounded" />
        <div
          className="absolute left-6 top-[22px] h-[3px] bg-primary transition-all duration-500 ease-out -z-10 rounded"
          style={{ width: `${Math.max(0, Math.min(100, (currentPhase / (totalPhases - 1)) * 100))}%` }}
        />

        {/* Phase Steps */}
        {Array.from({ length: totalPhases }).map((_, phase) => {
          const isCompleted = currentPhase > phase;
          const isActive = currentPhase === phase;
          const isUpcoming = currentPhase < phase;

          return (
            <div key={phase} className="flex flex-col items-center relative z-10">
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 border-2 shadow-sm',
                  isCompleted && 'bg-green-500 border-green-500 text-white',
                  isActive && 'bg-primary border-primary text-primary-foreground animate-pulse scale-105 shadow-primary/30 shadow-md',
                  isUpcoming && 'bg-card border-border text-muted-foreground'
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 stroke-[3px]" />
                ) : (
                  <span>{phase}</span>
                )}
              </div>
              <span
                className={cn(
                  'text-[9px] font-semibold mt-1.5 hidden md:block max-w-[65px] text-center leading-normal truncate',
                  isActive ? 'text-primary font-bold' : 'text-muted-foreground/75'
                )}
                title={PHASE_LABELS[phase]}
              >
                {phase === 0 ? 'Research' : phase === 1 ? 'Trends' : phase === 2 ? 'SEO' : phase === 3 ? 'Drafting' : phase === 4 ? 'Editing' : 'Optimising'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Dynamic Action text */}
      <div className="p-3 bg-secondary/35 rounded-lg border border-border/80 text-xs flex flex-col gap-1 items-start">
        <span className="font-semibold text-primary uppercase tracking-wider text-[10px]">Current Task:</span>
        <span className="text-foreground/90 font-medium font-sans animate-pulse">
          {PHASE_LABELS[currentPhase] || 'Orchestrating agents...'}
        </span>
      </div>
    </div>
  );
};
