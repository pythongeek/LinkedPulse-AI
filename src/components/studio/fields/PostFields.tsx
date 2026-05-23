import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PostFieldsProps {
  hookFormula: string;
  onHookFormulaChange: (val: string) => void;
  ctaType: string;
  onCtaTypeChange: (val: string) => void;
  emojiBudget: number;
  onEmojiBudgetChange: (val: number) => void;
  linkToInclude: string;
  onLinkToIncludeChange: (val: string) => void;
}

const HOOK_FORMULAS = [
  { id: 'question', emoji: '🤔', label: 'Question', desc: 'Have you ever noticed...', eg: '"Why does 90% of SaaS marketing fail in the first 6 months?"' },
  { id: 'contrarian', emoji: '⚡', label: 'Contrarian', desc: 'Everyone is wrong...', eg: '"Most marketing advice is actively burning your budget. Here is why."' },
  { id: 'statistic', emoji: '📊', label: 'Statistic', desc: 'X% of people never...', eg: '"82% of developers burn out due to this single workflow mistake:"' },
  { id: 'story', emoji: '📖', label: 'Story', desc: '3 years ago I...', eg: '"3 years ago, I was fired. It was the best thing that ever happened to me:"' },
  { id: 'bold_claim', emoji: '🎯', label: 'Bold Claim', desc: 'The [thing] is dead', eg: '"The traditional resume is dead. Here is what is replacing it:"' }
];

const CTA_TYPES = [
  { id: 'comment', label: 'Comment', desc: 'Prompt for discussion' },
  { id: 'share', label: 'Share', desc: 'Prompt to repost' },
  { id: 'dm', label: 'DM', desc: 'Direct message for resource' },
  { id: 'visit_link', label: 'Link Click', desc: 'Check link in comments' },
  { id: 'follow', label: 'Follow', desc: 'Follow profile' }
];

export const PostFields: React.FC<PostFieldsProps> = ({
  hookFormula,
  onHookFormulaChange,
  ctaType,
  onCtaTypeChange,
  emojiBudget,
  onEmojiBudgetChange,
  linkToInclude,
  onLinkToIncludeChange,
}) => {
  return (
    <div className="space-y-6">
      {/* Hook Formulas */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-semibold">Hook Formula</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground hover:text-foreground">
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-xs">Different hooks appeal to different psychology models. Choose one to anchor the opening line.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {HOOK_FORMULAS.map((formula) => {
            const isSelected = hookFormula === formula.id;
            return (
              <button
                key={formula.id}
                type="button"
                id={`hook-formula-${formula.id}`}
                onClick={() => onHookFormulaChange(formula.id)}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border text-left transition-all duration-200 select-none group',
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border bg-card hover:bg-accent/40 hover:border-muted-foreground/30'
                )}
              >
                <span className="text-2xl mt-0.5">{formula.emoji}</span>
                <div className="flex flex-col">
                  <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                    {formula.label}
                  </span>
                  <span className="text-xs text-muted-foreground mt-0.5">
                    {formula.desc}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60 italic mt-1 leading-relaxed">
                    {formula.eg}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* CTA Type & Emoji Budget */}
      <div className="flex flex-col gap-6">
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Call to Action (CTA)</Label>
          <div className="flex flex-wrap gap-2">
            {CTA_TYPES.map((type) => {
              const isSelected = ctaType === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  id={`cta-type-${type.id}`}
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

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-semibold">Emoji Budget</Label>
            <span className="text-xs font-mono bg-secondary px-2 py-0.5 rounded font-medium text-foreground">
              {emojiBudget === 0 ? '🚫 None' : Array(emojiBudget).fill('✨').join('') + ` (${emojiBudget} max)`}
            </span>
          </div>
          <div className="pt-2">
            <Slider
              id="emoji-budget-slider"
              value={[emojiBudget]}
              min={0}
              max={5}
              step={1}
              onValueChange={(val) => onEmojiBudgetChange(val[0])}
            />
          </div>
        </div>
      </div>

      {/* Optional link */}
      <div className="space-y-2">
        <Label htmlFor="link-to-include" className="text-sm font-semibold">Link to include (Optional)</Label>
        <Input
          id="link-to-include"
          type="url"
          placeholder="https://yourwebsite.com/resource"
          value={linkToInclude}
          onChange={(e) => onLinkToIncludeChange(e.target.value)}
          className="bg-card/45 border-border"
        />
        <p className="text-[10px] text-muted-foreground/80 italic">
          💡 The system will place this link strategically in the first comment to avoid LinkedIn's link-reach penalty.
        </p>
      </div>
    </div>
  );
};
