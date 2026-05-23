import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Layers,
  BookOpen,
  BarChart2,
  Lightbulb,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Bookmark,
  Zap,
  Hash,
  ArrowUpRight,
  AlignLeft,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface GapCardProps {
  gap: {
    gap: string;
    rationale: string;
    suggestedFormat: string;
    competitorScore: number;
    openingHook?: string;
    suggestedHookFormula?: string;
    priorityScore?: number;
    competitionLevel?: string;
    estimatedEngagementLift?: string;
    hashtags?: string[];
    // brief fields (may come from contentBrief)
    headline?: string;
    keyPoints?: string[];
    uniqueDataAngle?: string;
    ctaType?: string;
    whyItWins?: string;
  };
  topic: string;
  audienceSegment?: string;
  onGenerate: (gap: any) => void;
  onSave?: (gap: any) => void;
}

// ─── Icon helpers ─────────────────────────────────────────────────────────────
const FORMAT_ICON: Record<string, React.ReactNode> = {
  post:     <FileText className="w-3.5 h-3.5" />,
  carousel: <Layers className="w-3.5 h-3.5" />,
  article:  <BookOpen className="w-3.5 h-3.5" />,
  poll:     <BarChart2 className="w-3.5 h-3.5" />,
};

// ─── Competition badge ────────────────────────────────────────────────────────
function CompetitionBadge({ level }: { level?: string }) {
  const map: Record<string, string> = {
    low:    'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    medium: 'bg-amber-500/15  text-amber-300  border-amber-500/30',
    high:   'bg-red-500/15    text-red-300    border-red-500/30',
  };
  const l = (level ?? 'medium').toLowerCase();
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border',
      map[l] ?? map.medium
    )}>
      {l} competition
    </span>
  );
}

// ─── Score pill ───────────────────────────────────────────────────────────────
function ScorePill({ score }: { score?: number }) {
  if (score == null) return null;
  const color =
    score >= 80 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' :
    score >= 60 ? 'text-green-400   bg-green-500/10   border-green-500/30'   :
    score >= 40 ? 'text-amber-400   bg-amber-500/10   border-amber-500/30'   :
                  'text-red-400     bg-red-500/10     border-red-500/30';
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border',
      color
    )}>
      {score}<span className="font-normal opacity-60">/100</span>
    </span>
  );
}

// ─── Hook formula badge ───────────────────────────────────────────────────────
function HookFormulaBadge({ formula }: { formula?: string }) {
  if (!formula) return null;
  const label = formula.replace(/_/g, ' ');
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/30 uppercase tracking-wide">
      {label} formula
    </span>
  );
}

// ─── Brief section ────────────────────────────────────────────────────────────
function BriefSection({ gap }: { gap: GapCardProps['gap'] }) {
  const hook = gap.openingHook ?? '';
  const hookLen = hook.length;
  const overLimit = hookLen > 210;

  return (
    <div className="mt-3 space-y-4 border-t border-white/10 pt-4">
      {/* headline */}
      {gap.headline && (
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-1 font-semibold">Headline</p>
          <p className="text-sm font-semibold text-white leading-snug">{gap.headline}</p>
        </div>
      )}

      {/* opening hook */}
      {hook && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Opening Hook</p>
            <span className={cn(
              'text-[10px] font-mono font-bold px-1.5 py-0.5 rounded',
              overLimit ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
            )}>
              {hookLen}/210
            </span>
          </div>
          <p className={cn(
            'text-sm italic leading-relaxed p-3 rounded-lg border',
            overLimit
              ? 'bg-red-500/5 border-red-500/20 text-red-200'
              : 'bg-violet-500/5 border-violet-500/20 text-slate-200'
          )}>
            "{hook}"
          </p>
        </div>
      )}

      {/* key points */}
      {gap.keyPoints && gap.keyPoints.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-2 font-semibold">Key Points</p>
          <ul className="space-y-1.5">
            {gap.keyPoints.map((pt, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="mt-1 w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 text-[9px] font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                {pt}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* unique data angle */}
      {gap.uniqueDataAngle && (
        <div className="flex gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-300 mb-0.5">Unique Data Angle</p>
            <p className="text-xs text-amber-200/80">{gap.uniqueDataAngle}</p>
          </div>
        </div>
      )}

      {/* CTA */}
      {gap.ctaType && (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
          <span>CTA: <span className="text-slate-300 font-medium">{gap.ctaType}</span></span>
        </div>
      )}

      {/* why it wins */}
      {gap.whyItWins && (
        <div className="flex gap-2.5 p-3 rounded-lg bg-emerald-500/8 border border-emerald-500/20">
          <Lightbulb className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-emerald-300 mb-0.5">Why it wins</p>
            <p className="text-xs text-emerald-200/80">{gap.whyItWins}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function GapCard({ gap, topic, audienceSegment, onGenerate, onSave }: GapCardProps) {
  const navigate = useNavigate();
  const [briefOpen, setBriefOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const gapType = gap.gap?.match(/\[(.*?)\]/)?.[1] ?? 'angle';
  const gapTitle = gap.gap?.replace(/\[.*?\]\s*/, '') || gap.gap;

  function handleGenerate() {
    const params = new URLSearchParams({
      topic: `${topic}: ${gap.gap}`,
      contentType: gap.suggestedFormat,
    });
    if (gap.suggestedHookFormula) params.set('hookFormula', gap.suggestedHookFormula);
    if (gap.openingHook) params.set('customInstructions', `Start with: "${gap.openingHook}"`);
    if (audienceSegment) params.set('audienceSegment', audienceSegment);

    onGenerate(gap);
    navigate(`/content/studio?${params.toString()}`);
  }

  function handleCopyHook() {
    if (!gap.openingHook) return;
    navigator.clipboard.writeText(gap.openingHook).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Card className="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-800/70 backdrop-blur-sm shadow-xl hover:shadow-2xl hover:border-white/20 transition-all duration-300 hover:-translate-y-0.5">
      {/* accent stripe top */}
      <div className="h-0.5 w-full bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500 opacity-60 group-hover:opacity-100 transition-opacity" />

      <CardContent className="p-5 space-y-4">
        {/* ─── Top row: badges + score ─── */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30 uppercase tracking-wide">
            {gapType}
          </span>
          <CompetitionBadge level={gap.competitionLevel} />
          <ScorePill score={gap.priorityScore} />
        </div>

        {/* ─── Gap title ─── */}
        <h4 className="text-sm font-bold text-white leading-snug">{gapTitle}</h4>

        {/* ─── Rationale ─── */}
        <p className="text-xs text-slate-400 leading-relaxed">{gap.rationale}</p>

        {/* ─── Why this wins ─── */}
        {gap.rationale && (
          <div className="flex gap-2 text-xs text-slate-300">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span><span className="text-amber-300 font-semibold">💡 Why this wins: </span>{gap.rationale}</span>
          </div>
        )}

        {/* ─── Opening Hook box ─── */}
        {gap.openingHook && (
          <div className="relative p-3 rounded-lg border border-violet-500/25 bg-violet-500/8 group/hook">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <p className="text-[10px] uppercase tracking-widest font-semibold text-violet-400">Pre-built Opening Hook</p>
              <HookFormulaBadge formula={gap.suggestedHookFormula} />
            </div>
            <p className="text-xs text-slate-200 italic leading-relaxed mb-2">"{gap.openingHook}"</p>
            <button
              onClick={handleCopyHook}
              className="flex items-center gap-1.5 text-[10px] font-semibold text-violet-400 hover:text-violet-300 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied!' : 'Copy hook'}
            </button>
          </div>
        )}

        {/* ─── Bottom meta row ─── */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {/* format badge */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-slate-700/80 text-slate-300 border border-slate-600/50 font-medium">
            {FORMAT_ICON[gap.suggestedFormat] ?? <FileText className="w-3 h-3" />}
            {gap.suggestedFormat}
          </span>

          {/* engagement lift */}
          {gap.estimatedEngagementLift && (
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <Zap className="w-3 h-3" /> {gap.estimatedEngagementLift}
            </span>
          )}

          {/* hashtags */}
          {gap.hashtags?.slice(0, 3).map((tag, i) => (
            <span key={i} className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 bg-slate-700/50 px-1.5 py-0.5 rounded-md border border-slate-600/40">
              <Hash className="w-2.5 h-2.5" />{tag.replace('#', '')}
            </span>
          ))}
        </div>

        {/* ─── Action buttons ─── */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
          {/* Generate */}
          <Button
            size="sm"
            onClick={handleGenerate}
            className="flex-1 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-semibold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all duration-200 hover:-translate-y-0.5 text-xs"
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            📝 Generate Content
          </Button>

          {/* View Brief toggle */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setBriefOpen((v) => !v)}
            className="border-white/15 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all text-xs gap-1"
          >
            <AlignLeft className="w-3.5 h-3.5" />
            Brief
            {briefOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>

          {/* Save */}
          {onSave && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSave(gap)}
              className="border-white/15 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all px-2.5"
              title="Save gap idea"
            >
              <Bookmark className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {/* ─── Brief accordion ─── */}
        {briefOpen && <BriefSection gap={gap} />}
      </CardContent>
    </Card>
  );
}

export default GapCard;
