import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Minus, Plus, Vote } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PollFieldsProps {
  pollDuration: string;
  onPollDurationChange: (val: string) => void;
  optionCount: number;
  onOptionCountChange: (val: number) => void;
}

const DURATIONS = [
  { id: '1_day', label: '1 day' },
  { id: '3_days', label: '3 days' },
  { id: '1_week', label: '1 week' },
  { id: '2_weeks', label: '2 weeks' }
];

export const PollFields: React.FC<PollFieldsProps> = ({
  pollDuration,
  onPollDurationChange,
  optionCount,
  onOptionCountChange,
}) => {
  const increment = () => {
    if (optionCount < 4) onOptionCountChange(optionCount + 1);
  };

  const decrement = () => {
    if (optionCount > 2) onOptionCountChange(optionCount - 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 items-start">
        {/* Options Count Stepper */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Number of Poll Options</Label>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              id="poll-options-decrement"
              onClick={decrement}
              disabled={optionCount <= 2}
              className="h-9 w-9 bg-card border-border hover:bg-accent/40"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <span className="w-12 text-center text-lg font-mono font-bold text-foreground">
              {optionCount}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              id="poll-options-increment"
              onClick={increment}
              disabled={optionCount >= 4}
              className="h-9 w-9 bg-card border-border hover:bg-accent/40"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground italic pl-2">
              (Limits: 2 to 4 options)
            </span>
          </div>
        </div>

        {/* Poll Duration */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Poll Duration</Label>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((dur) => {
              const isSelected = pollDuration === dur.id;
              return (
                <button
                  key={dur.id}
                  type="button"
                  id={`poll-duration-${dur.id}`}
                  onClick={() => onPollDurationChange(dur.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-200',
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card hover:bg-accent/40 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {dur.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Interactive poll mockup preview */}
      <div className="space-y-2.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
          LinkedIn Poll Mockup Preview
        </Label>
        <div className="p-4 bg-card/65 rounded-lg border border-border/80 space-y-3">
          <div className="text-sm font-medium text-foreground italic opacity-75">
            [Poll question will be generated here...]
          </div>
          
          <div className="space-y-2">
            {Array.from({ length: optionCount }).map((_, i) => (
              <div
                key={i}
                className="w-full p-2.5 rounded-md border border-border bg-secondary/35 text-xs text-muted-foreground flex items-center justify-between"
              >
                <span>Option {i + 1}</span>
                <span className="text-[10px] text-muted-foreground/60">0%</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2 border-t border-border/50 pt-2">
            <div className="flex items-center gap-1">
              <Vote className="w-3.5 h-3.5" />
              <span>0 votes • {pollDuration.replace('_', ' ')} left</span>
            </div>
            <span className="font-semibold text-primary/80">Submit vote</span>
          </div>
        </div>
      </div>
    </div>
  );
};
