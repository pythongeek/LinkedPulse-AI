import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Slide {
  slideNumber: number;
  type: 'cover' | 'content' | 'cta';
  headline: string;
  body: string;
}

interface SlideEditorProps {
  slides: Slide[];
  onSlidesChange: (updatedSlides: Slide[]) => void;
}

export const SlideEditor: React.FC<SlideEditorProps> = ({
  slides = [],
  onSlidesChange,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!slides || slides.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg border-border bg-card/25">
        No slides generated. Try generating carousel content first.
      </div>
    );
  }

  const currentSlide = slides[currentIndex];
  const totalSlides = slides.length;

  const handleFieldChange = (field: 'headline' | 'body', value: string) => {
    const updated = [...slides];
    updated[currentIndex] = {
      ...currentSlide,
      [field]: value,
    };
    onSlidesChange(updated);
  };

  const nextSlide = () => {
    if (currentIndex < totalSlides - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const prevSlide = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Limits
  const headlineMax = 150;
  const bodyMax = 300;

  const getSlideBadgeVariant = (type: string) => {
    if (type === 'cover') return 'default';
    if (type === 'cta') return 'secondary';
    return 'outline';
  };

  return (
    <div className="border border-border/80 bg-card rounded-xl p-5 space-y-6 text-foreground text-left shadow-inner">
      {/* Slide Index Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <Badge variant={getSlideBadgeVariant(currentSlide.type)} className="uppercase text-[9px] font-bold tracking-wide">
            {currentSlide.type} Slide
          </Badge>
          <span className="text-xs font-semibold text-muted-foreground">
            Slide {currentSlide.slideNumber} of {totalSlides}
          </span>
        </div>
        
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={prevSlide}
            disabled={currentIndex === 0}
            className="h-8 w-8 bg-card border-border hover:bg-accent/40"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={nextSlide}
            disabled={currentIndex === totalSlides - 1}
            className="h-8 w-8 bg-card border-border hover:bg-accent/40"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Editing Panel */}
      <div className="space-y-4">
        {/* Headline */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="slide-headline-input" className="text-xs font-semibold text-foreground/80">
              Slide Headline
            </Label>
            <span
              className={cn(
                'text-[10px] font-mono font-semibold',
                (currentSlide.headline?.length || 0) > headlineMax ? 'text-destructive' : 'text-muted-foreground'
              )}
            >
              {(currentSlide.headline?.length || 0)} / {headlineMax}
            </span>
          </div>
          <Input
            id="slide-headline-input"
            type="text"
            value={currentSlide.headline || ''}
            onChange={(e) => handleFieldChange('headline', e.target.value)}
            className={cn(
              'bg-card border-border',
              (currentSlide.headline?.length || 0) > headlineMax && 'border-destructive focus-visible:ring-destructive'
            )}
          />
        </div>

        {/* Body content */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="slide-body-textarea" className="text-xs font-semibold text-foreground/80">
              Slide Body Content
            </Label>
            <span
              className={cn(
                'text-[10px] font-mono font-semibold',
                (currentSlide.body?.length || 0) > bodyMax ? 'text-destructive' : 'text-muted-foreground'
              )}
            >
              {(currentSlide.body?.length || 0)} / {bodyMax}
            </span>
          </div>
          <Textarea
            id="slide-body-textarea"
            rows={4}
            value={currentSlide.body || ''}
            onChange={(e) => handleFieldChange('body', e.target.value)}
            className={cn(
              'bg-card border-border leading-relaxed',
              (currentSlide.body?.length || 0) > bodyMax && 'border-destructive focus-visible:ring-destructive'
            )}
          />
        </div>
      </div>

      {/* Slide Preview Box */}
      <div className="p-4 bg-secondary/35 rounded-lg border border-dashed border-border/80 space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          <Eye className="w-3.5 h-3.5" />
          <span>Carousel Slide Preview Mockup</span>
        </div>
        <div className="aspect-[1/1] w-full max-w-[280px] mx-auto rounded-lg border border-border bg-card flex flex-col justify-between p-6 shadow-sm select-none">
          <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase">
            <span>LinkedPulse AI</span>
            <span>{currentSlide.slideNumber} / {totalSlides}</span>
          </div>
          
          <div className="space-y-3 my-auto text-center">
            <h3 className="font-extrabold text-sm text-foreground leading-snug break-words">
              {currentSlide.headline || 'Your Bold Headline'}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed break-words whitespace-pre-wrap">
              {currentSlide.body || 'Slide body content bullets and notes.'}
            </p>
          </div>

          <div className="text-[9px] text-center text-primary font-semibold tracking-wide uppercase">
            {currentIndex === totalSlides - 1 ? 'SWIPE TO ENGAGE ⚡' : 'SWIPE LEFT 👉'}
          </div>
        </div>
      </div>

      {/* Slide Thumbnails Selector */}
      <div className="space-y-2">
        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          Quick Navigation
        </Label>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {slides.map((slide, i) => {
            const isActive = currentIndex === i;
            return (
              <button
                key={slide.slideNumber}
                type="button"
                id={`slide-thumbnail-${slide.slideNumber}`}
                onClick={() => setCurrentIndex(i)}
                className={cn(
                  'flex-shrink-0 w-8 h-10 rounded border text-[10px] font-mono font-bold flex flex-col items-center justify-center transition-all',
                  isActive
                    ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                    : 'border-border bg-card hover:bg-accent/40 text-muted-foreground hover:text-foreground'
                )}
              >
                <span>{slide.slideNumber}</span>
                <span className="text-[6px] opacity-70 uppercase tracking-widest font-sans font-normal">
                  {slide.type === 'cover' ? 'Cov' : slide.type === 'cta' ? 'Cta' : 'Pt'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
