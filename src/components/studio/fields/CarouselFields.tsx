import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CarouselFieldsProps {
  slideCount: number;
  onSlideCountChange: (val: number) => void;
  ctaType: string;
  onCtaTypeChange: (val: string) => void;
}

const CAROUSEL_CTA_TYPES = [
  { id: 'comment', label: 'Comment', desc: 'Ask for feedback' },
  { id: 'share', label: 'Share', desc: 'Ask to repost' },
  { id: 'follow', label: 'Follow', desc: 'Prompt to follow profile' },
  { id: 'save', label: 'Save', desc: 'Save for later' }
];

export const CarouselFields: React.FC<CarouselFieldsProps> = ({
  slideCount,
  onSlideCountChange,
  ctaType,
  onCtaTypeChange,
}) => {
  const increment = () => {
    if (slideCount < 15) onSlideCountChange(slideCount + 1);
  };

  const decrement = () => {
    if (slideCount > 5) onSlideCountChange(slideCount - 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 items-start">
        {/* Slide Count Stepper */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Slide Count</Label>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              id="slide-count-decrement"
              onClick={decrement}
              disabled={slideCount <= 5}
              className="h-9 w-9 bg-card border-border hover:bg-accent/40"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <span className="w-12 text-center text-lg font-mono font-bold text-foreground">
              {slideCount}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              id="slide-count-increment"
              onClick={increment}
              disabled={slideCount >= 15}
              className="h-9 w-9 bg-card border-border hover:bg-accent/40"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground italic pl-2">
              (Optimal range: 7–12 slides)
            </span>
          </div>
        </div>

        {/* CTA Type */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Carousel CTA</Label>
          <div className="flex flex-wrap gap-2">
            {CAROUSEL_CTA_TYPES.map((type) => {
              const isSelected = ctaType === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  id={`carousel-cta-${type.id}`}
                  onClick={() => onCtaTypeChange(type.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-200',
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card hover:bg-accent/40 text-muted-foreground hover:text-foreground'
                  )}
                  title={type.desc}
                >
                  {type.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Slide deck visualizer */}
      <div className="space-y-2.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
          Slide Deck Structure Preview
        </Label>
        <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
          {/* Cover Slide */}
          <div className="flex-shrink-0 w-20 h-24 rounded border border-primary bg-primary/10 flex flex-col justify-between p-2 select-none shadow">
            <span className="text-[8px] font-bold text-primary uppercase">Slide 1</span>
            <span className="text-[10px] font-extrabold text-foreground leading-tight text-center truncate">COVER</span>
            <span className="text-[7px] text-muted-foreground text-center truncate">Outcome hook</span>
          </div>

          {/* Content Slides */}
          {Array.from({ length: slideCount - 2 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-16 h-24 rounded border border-border bg-card/65 flex flex-col justify-between p-2 select-none"
            >
              <span className="text-[8px] font-semibold text-muted-foreground">Slide {i + 2}</span>
              <span className="text-[9px] font-medium text-foreground/80 leading-none text-center">Point {i + 1}</span>
              <span className="text-[6px] text-muted-foreground/60 text-center">Detail / stat</span>
            </div>
          ))}

          {/* CTA Slide */}
          <div className="flex-shrink-0 w-20 h-24 rounded border border-primary/60 bg-primary/5 flex flex-col justify-between p-2 select-none shadow">
            <span className="text-[8px] font-bold text-primary/80 uppercase">Slide {slideCount}</span>
            <span className="text-[10px] font-extrabold text-foreground leading-tight text-center truncate">CTA</span>
            <span className="text-[7px] text-primary/85 text-center font-semibold truncate capitalize">
              {ctaType}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
