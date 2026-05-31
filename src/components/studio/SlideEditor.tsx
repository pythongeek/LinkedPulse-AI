import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Slide {
  slideNumber: number;
  type: 'cover' | 'content' | 'quote' | 'cta';
  headline: string;
  body: string;
}

interface SlideTheme {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  authorName: string;
  authorHandle: string;
}

interface SlideEditorProps {
  slides: Slide[];
  onSlidesChange: (updatedSlides: Slide[]) => void;
  theme?: SlideTheme;
}

export const SlideEditor: React.FC<SlideEditorProps> = ({
  slides = [],
  onSlidesChange,
  theme,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!slides || !Array.isArray(slides) || slides.length === 0) {
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

  // Fallback defaults for theme
  const activeTheme = theme || {
    primaryColor: '#0284C7',
    backgroundColor: '#F8FAFC',
    textColor: '#0F172A',
    accentColor: '#64748B',
    authorName: 'LinkedPulse AI',
    authorHandle: '@linkedpulse',
  };

  return (
    <div className="border border-border/80 bg-card rounded-xl p-5 space-y-6 text-foreground text-left shadow-inner">
      {/* Slide Index Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-3">
          <Select 
            value={currentSlide.type || 'content'} 
            onValueChange={(val: 'cover' | 'content' | 'quote' | 'cta') => {
              const updated = [...slides];
              updated[currentIndex] = {
                ...currentSlide,
                type: val,
              };
              onSlidesChange(updated);
            }}
          >
            <SelectTrigger className="w-28 h-8 text-[10px] font-bold uppercase bg-card border-border">
              <SelectValue placeholder="Slide Layout" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cover">Cover Hook</SelectItem>
              <SelectItem value="content">Content</SelectItem>
              <SelectItem value="quote">Big Quote</SelectItem>
              <SelectItem value="cta">CTA Slide</SelectItem>
            </SelectContent>
          </Select>
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
        
        {/* Dynamic Theme Mockup rendering */}
        {currentSlide.type === 'cta' ? (
          <div 
            className="aspect-[1/1] w-full max-w-[280px] mx-auto rounded-lg flex flex-col justify-between p-6 shadow-sm select-none border border-border"
            style={{ 
              backgroundColor: activeTheme.primaryColor,
              color: '#FFFFFF'
            }}
          >
            <div className="flex justify-between items-center text-[10px] font-bold uppercase opacity-80">
              <span>{activeTheme.authorName}</span>
              <span>{currentSlide.slideNumber} / {totalSlides}</span>
            </div>
            
            <div className="space-y-3 my-auto text-center">
              <h3 className="font-extrabold text-sm leading-snug break-words">
                {currentSlide.headline || 'Your Bold Headline'}
              </h3>
              <div className="w-8 h-0.5 mx-auto bg-white/45 my-2" />
              <p className="text-xs leading-relaxed break-words whitespace-pre-wrap text-center opacity-90">
                {currentSlide.body || 'Slide body content bullets and notes.'}
              </p>
            </div>

            <div className="text-[9px] text-center font-bold tracking-wide uppercase text-white">
              {currentIndex === totalSlides - 1 ? 'SWIPE TO ENGAGE ⚡' : 'SWIPE LEFT 👉'}
            </div>
          </div>
        ) : (
          <div 
            className="aspect-[1/1] w-full max-w-[280px] mx-auto rounded-lg flex flex-col justify-between p-6 shadow-sm select-none border border-border"
            style={{ 
              backgroundColor: activeTheme.backgroundColor,
              color: activeTheme.textColor
            }}
          >
            <div 
              className="flex justify-between items-center text-[10px] font-bold uppercase"
              style={{ color: activeTheme.accentColor }}
            >
              <span>{activeTheme.authorName}</span>
              <span>{currentSlide.slideNumber} / {totalSlides}</span>
            </div>
            
            <div className="space-y-3 my-auto text-center">
              {currentSlide.type === 'cover' && (
                <div 
                  className="w-12 h-1.5 mx-auto mb-2"
                  style={{ backgroundColor: activeTheme.primaryColor }}
                />
              )}
              {currentSlide.type === 'quote' && (
                <span 
                  className="block text-4xl font-extrabold -mb-2"
                  style={{ color: activeTheme.primaryColor }}
                >
                  “
                </span>
              )}
              <h3 
                className="font-extrabold text-sm leading-snug break-words"
                style={{ color: activeTheme.textColor }}
              >
                {currentSlide.headline || 'Your Bold Headline'}
              </h3>
              <p 
                className="text-xs leading-relaxed break-words whitespace-pre-wrap text-center"
                style={{ 
                  color: currentSlide.type === 'quote' ? activeTheme.primaryColor : activeTheme.textColor,
                  fontStyle: currentSlide.type === 'quote' ? 'italic' : 'normal',
                  fontWeight: currentSlide.type === 'quote' ? 'bold' : 'normal',
                  opacity: currentSlide.type === 'quote' ? 1 : 0.8
                }}
              >
                {currentSlide.type === 'quote' && currentSlide.body ? `— ${currentSlide.body}` : (currentSlide.body || 'Slide body content bullets and notes.')}
              </p>
            </div>

            <div 
              className="text-[9px] text-center font-semibold tracking-wide uppercase"
              style={{ color: activeTheme.primaryColor }}
            >
              {currentIndex === totalSlides - 1 ? 'SWIPE TO ENGAGE ⚡' : 'SWIPE LEFT 👉'}
            </div>
          </div>
        )}
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
                  {slide.type === 'cover' ? 'Cov' : slide.type === 'cta' ? 'Cta' : slide.type === 'quote' ? 'Quo' : 'Pt'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
