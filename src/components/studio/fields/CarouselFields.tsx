import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CarouselTheme {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  authorName: string;
  authorHandle: string;
}

interface CarouselFieldsProps {
  slideCount: number;
  onSlideCountChange: (val: number) => void;
  ctaType: string;
  onCtaTypeChange: (val: string) => void;
  theme: CarouselTheme;
  onThemeChange: (updatedTheme: CarouselTheme) => void;
}

const CAROUSEL_CTA_TYPES = [
  { id: 'comment', label: 'Comment', desc: 'Ask for feedback' },
  { id: 'share', label: 'Share', desc: 'Ask to repost' },
  { id: 'follow', label: 'Follow', desc: 'Prompt to follow profile' },
  { id: 'save', label: 'Save', desc: 'Save for later' }
];

const COLOR_PRESETS = [
  {
    name: 'Ocean Blue',
    primaryColor: '#0284C7',
    backgroundColor: '#F8FAFC',
    textColor: '#0F172A',
    accentColor: '#64748B',
  },
  {
    name: 'Sleek Dark',
    primaryColor: '#6366F1',
    backgroundColor: '#0B0F19',
    textColor: '#F3F4F6',
    accentColor: '#9CA3AF',
  },
  {
    name: 'Terracotta',
    primaryColor: '#D97706',
    backgroundColor: '#FFFDF9',
    textColor: '#451A03',
    accentColor: '#78350F',
  },
  {
    name: 'Emerald',
    primaryColor: '#10B981',
    backgroundColor: '#F0FDF4',
    textColor: '#064E3B',
    accentColor: '#047857',
  }
];

export const CarouselFields: React.FC<CarouselFieldsProps> = ({
  slideCount,
  onSlideCountChange,
  ctaType,
  onCtaTypeChange,
  theme,
  onThemeChange,
}) => {
  const increment = () => {
    if (slideCount < 15) onSlideCountChange(slideCount + 1);
  };

  const decrement = () => {
    if (slideCount > 5) onSlideCountChange(slideCount - 1);
  };

  const handleBrandingChange = (field: 'authorName' | 'authorHandle', val: string) => {
    onThemeChange({
      ...theme,
      [field]: val,
    });
  };

  const handleColorChange = (field: 'primaryColor' | 'backgroundColor' | 'textColor' | 'accentColor', val: string) => {
    onThemeChange({
      ...theme,
      [field]: val,
    });
  };

  const selectPreset = (preset: typeof COLOR_PRESETS[0]) => {
    onThemeChange({
      ...theme,
      primaryColor: preset.primaryColor,
      backgroundColor: preset.backgroundColor,
      textColor: preset.textColor,
      accentColor: preset.accentColor,
    });
  };

  return (
    <div className="space-y-6 text-left">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Slide Count Stepper */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-slate-300">Slide Count</Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              id="slide-count-decrement"
              onClick={decrement}
              disabled={slideCount <= 5}
              className="h-8 w-8 bg-card border-border hover:bg-accent/40"
            >
              <Minus className="w-3.5 h-3.5" />
            </Button>
            <span className="w-8 text-center text-sm font-mono font-bold text-foreground">
              {slideCount}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              id="slide-count-increment"
              onClick={increment}
              disabled={slideCount >= 15}
              className="h-8 w-8 bg-card border-border hover:bg-accent/40"
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
            <span className="text-[10px] text-muted-foreground italic pl-1">
              (7–12 optimal)
            </span>
          </div>
        </div>

        {/* CTA Type */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-slate-300">Carousel CTA</Label>
          <div className="flex flex-wrap gap-1.5">
            {CAROUSEL_CTA_TYPES.map((type) => {
              const isSelected = ctaType === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  id={`carousel-cta-${type.id}`}
                  onClick={() => onCtaTypeChange(type.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-full border text-[10px] font-medium transition-all duration-200',
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

      {/* Branding Settings */}
      <div className="space-y-3 border-t border-border/40 pt-4">
        <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Branding</h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="authorName" className="text-[11px] font-semibold text-slate-300">Author Name</Label>
            <Input
              id="authorName"
              type="text"
              placeholder="e.g. Jane Doe"
              value={theme.authorName || ''}
              onChange={(e) => handleBrandingChange('authorName', e.target.value)}
              className="h-8 text-xs bg-card border-border text-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="authorHandle" className="text-[11px] font-semibold text-slate-300">LinkedIn Handle</Label>
            <Input
              id="authorHandle"
              type="text"
              placeholder="e.g. @janedoe"
              value={theme.authorHandle || ''}
              onChange={(e) => handleBrandingChange('authorHandle', e.target.value)}
              className="h-8 text-xs bg-card border-border text-foreground"
            />
          </div>
        </div>
      </div>

      {/* Theme Presets */}
      <div className="space-y-3 border-t border-border/40 pt-4">
        <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Color Presets</h5>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {COLOR_PRESETS.map((preset) => {
            const isSelected =
              theme.primaryColor === preset.primaryColor &&
              theme.backgroundColor === preset.backgroundColor;
            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => selectPreset(preset)}
                className={cn(
                  'p-2 rounded-lg border text-left flex flex-col gap-1.5 transition-all duration-200 bg-card hover:bg-accent/20',
                  isSelected ? 'border-primary ring-1 ring-primary' : 'border-border'
                )}
              >
                <span className="text-[10px] font-semibold text-foreground truncate">{preset.name}</span>
                <div className="flex gap-1">
                  <div className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ backgroundColor: preset.backgroundColor }} title="Background" />
                  <div className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ backgroundColor: preset.textColor }} title="Text" />
                  <div className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ backgroundColor: preset.primaryColor }} title="Primary" />
                  <div className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ backgroundColor: preset.accentColor }} title="Accent" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Colors */}
      <div className="space-y-3 border-t border-border/40 pt-4">
        <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Custom Colors</h5>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex items-center gap-2 bg-secondary/20 p-1.5 rounded-lg border border-border">
            <input
              type="color"
              id="bg-color-picker"
              value={theme.backgroundColor}
              onChange={(e) => handleColorChange('backgroundColor', e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border-none bg-transparent"
            />
            <Label htmlFor="bg-color-picker" className="text-[10px] font-semibold text-slate-300 select-none cursor-pointer truncate">Background</Label>
          </div>
          <div className="flex items-center gap-2 bg-secondary/20 p-1.5 rounded-lg border border-border">
            <input
              type="color"
              id="text-color-picker"
              value={theme.textColor}
              onChange={(e) => handleColorChange('textColor', e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border-none bg-transparent"
            />
            <Label htmlFor="text-color-picker" className="text-[10px] font-semibold text-slate-300 select-none cursor-pointer truncate">Text</Label>
          </div>
          <div className="flex items-center gap-2 bg-secondary/20 p-1.5 rounded-lg border border-border">
            <input
              type="color"
              id="primary-color-picker"
              value={theme.primaryColor}
              onChange={(e) => handleColorChange('primaryColor', e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border-none bg-transparent"
            />
            <Label htmlFor="primary-color-picker" className="text-[10px] font-semibold text-slate-300 select-none cursor-pointer truncate">Primary</Label>
          </div>
          <div className="flex items-center gap-2 bg-secondary/20 p-1.5 rounded-lg border border-border">
            <input
              type="color"
              id="accent-color-picker"
              value={theme.accentColor}
              onChange={(e) => handleColorChange('accentColor', e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border-none bg-transparent"
            />
            <Label htmlFor="accent-color-picker" className="text-[10px] font-semibold text-slate-300 select-none cursor-pointer truncate">Accent</Label>
          </div>
        </div>
      </div>

      {/* Slide deck visualizer */}
      <div className="space-y-2 border-t border-border/40 pt-4">
        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
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
          {Array.from({ length: Math.max(0, slideCount - 2) }).map((_, i) => (
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
