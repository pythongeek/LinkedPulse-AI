import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  Layers,
  BookOpen,
  BarChart2,
  Zap,
  Shield,
  Target,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SignalIntelligenceRowProps {
  opportunity: any; // enhanced opportunity object from API
  research: any;    // TopicResearchResult from API
  onGenerateNow: (contentType: string) => void;
}

// ─── Opportunity Score Ring ───────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const r = 44;
  const circumference = 2 * Math.PI * r;
  const filled = Math.max(0, Math.min(100, score));
  const offset = circumference - (filled / 100) * circumference;

  const color =
    filled >= 80 ? '#10b981' : // emerald
    filled >= 60 ? '#22c55e' : // green
    filled >= 40 ? '#f59e0b' : // amber
    '#ef4444';                  // red

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="112" height="112" className="-rotate-90">
        <circle
          cx="56" cy="56" r={r}
          strokeWidth="8"
          stroke="currentColor"
          className="text-white/10"
          fill="none"
        />
        <circle
          cx="56" cy="56" r={r}
          strokeWidth="8"
          stroke={color}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <span
        className="absolute text-3xl font-extrabold tracking-tight"
        style={{ color }}
      >
        {filled}
      </span>
    </div>
  );
}

// ─── Opportunity Level Badge ──────────────────────────────────────────────────
function OpportunityBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    Goldmine: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    Good:     'bg-green-500/20  text-green-400  border-green-500/40',
    Meh:      'bg-amber-500/20  text-amber-400  border-amber-500/40',
    Useless:  'bg-red-500/20    text-red-400    border-red-500/40',
  };
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
      map[level] ?? 'bg-slate-500/20 text-slate-400 border-slate-500/40'
    )}>
      {level === 'Goldmine' && '🏆'} {level}
    </span>
  );
}

// ─── Velocity config ──────────────────────────────────────────────────────────
function useVelocityConfig(velocity: string, velocity7d?: number) {
  const configs: Record<string, {
    icon: React.ReactNode;
    color: string;
    bg: string;
    label: string;
    sub: string;
  }> = {
    exploding: {
      icon: <TrendingUp className="w-6 h-6 animate-bounce" />,
      color: 'text-emerald-400',
      bg:    'bg-emerald-500/10',
      label: 'Trending NOW',
      sub:   velocity7d ? `+${velocity7d}% this week` : 'Explosive growth',
    },
    rising: {
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'text-green-400',
      bg:    'bg-green-500/10',
      label: 'Rising',
      sub:   velocity7d ? `+${velocity7d}% this week` : 'Growing steadily',
    },
    stable: {
      icon: <Minus className="w-6 h-6" />,
      color: 'text-slate-400',
      bg:    'bg-slate-500/10',
      label: 'Stable',
      sub:   'Steady interest',
    },
    cooling: {
      icon: <TrendingDown className="w-6 h-6" />,
      color: 'text-amber-400',
      bg:    'bg-amber-500/10',
      label: 'Cooling',
      sub:   'Losing momentum',
    },
    dying: {
      icon: <TrendingDown className="w-6 h-6" />,
      color: 'text-red-400',
      bg:    'bg-red-500/10',
      label: 'Dying',
      sub:   'Interest declining',
    },
  };
  return configs[velocity] ?? configs['stable'];
}

// ─── Format icon map ──────────────────────────────────────────────────────────
const FORMAT_ICON_MAP: Record<string, React.ReactNode> = {
  post:     <FileText className="w-7 h-7" />,
  carousel: <Layers className="w-7 h-7" />,
  article:  <BookOpen className="w-7 h-7" />,
  poll:     <BarChart2 className="w-7 h-7" />,
};

const FORMAT_ADVANTAGE: Record<string, string> = {
  post:     'Highest reach · 3k chars · Great for hooks',
  carousel: 'Max saves · 7–15 slides · Algorithm favourite',
  article:  'Google-indexed · Long-form authority',
  poll:     'Drives comments · 2–4 options · Fast engagement',
};

// ─── Main component ───────────────────────────────────────────────────────────
export function SignalIntelligenceRow({
  opportunity,
  research,
  onGenerateNow,
}: SignalIntelligenceRowProps) {
  const velConfig = useVelocityConfig(
    opportunity?.velocity,
    research?.velocity7d
  );

  const quality = research?.researchQuality ?? 'N/A';
  const isGrounded = research?.isFullyGrounded;
  const sourceCount = research?.dataSourceCount ?? 0;
  const weeklyPosts = research?.redditSignal?.weeklyPostCount ?? 0;

  const bestType: string = opportunity?.bestContentType ?? 'post';
  const formatIcon = FORMAT_ICON_MAP[bestType] ?? FORMAT_ICON_MAP.post;
  const formatAdvantage = FORMAT_ADVANTAGE[bestType] ?? '';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 w-full">

      {/* ── Card 1: Opportunity Score ── */}
      <Card className="relative overflow-hidden border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-800/60 backdrop-blur-sm shadow-xl">
        {/* subtle glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none" />
        <CardContent className="flex flex-col items-center justify-center gap-3 py-6 px-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
            <Target className="w-3.5 h-3.5" />
            Opportunity Score
          </div>
          <ScoreRing score={opportunity?.overallScore ?? 0} />
          <OpportunityBadge level={opportunity?.opportunityLevel ?? 'Meh'} />
          {opportunity?.isPeaking && (
            <span className="flex items-center gap-1 text-xs text-amber-400 font-medium animate-pulse">
              <Zap className="w-3 h-3" /> Peaking right now
            </span>
          )}
        </CardContent>
      </Card>

      {/* ── Card 2: Velocity ── */}
      <Card className="relative overflow-hidden border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-800/60 backdrop-blur-sm shadow-xl">
        <div className={cn('absolute inset-0 pointer-events-none', velConfig.bg)} style={{ opacity: 0.3 }} />
        <CardContent className="flex flex-col items-center justify-center gap-3 py-6 px-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Velocity
          </div>
          <div className={cn('flex items-center justify-center w-16 h-16 rounded-2xl', velConfig.bg)}>
            <span className={velConfig.color}>{velConfig.icon}</span>
          </div>
          <p className={cn('text-lg font-bold', velConfig.color)}>{velConfig.label}</p>
          <p className="text-xs text-slate-400 text-center">{velConfig.sub}</p>
          {research?.velocity7d !== undefined && (
            <Badge className={cn('text-xs', velConfig.color, 'bg-transparent border', velConfig.bg.replace('bg-', 'border-').replace('/10', '/40'))}>
              {research.velocity7d > 0 ? '+' : ''}{research.velocity7d}% / 7 days
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* ── Card 3: Data Quality ── */}
      <Card className="relative overflow-hidden border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-800/60 backdrop-blur-sm shadow-xl">
        <div className={cn(
          'absolute inset-0 pointer-events-none',
          isGrounded ? 'bg-emerald-500/5' : 'bg-amber-500/5'
        )} />
        <CardContent className="flex flex-col items-center justify-center gap-3 py-6 px-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
            <Shield className="w-3.5 h-3.5" />
            Data Quality
          </div>
          <div className="flex flex-col gap-2 w-full">
            <div className={cn(
              'flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium',
              isGrounded ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
            )}>
              <span>Verified Sources</span>
              <span className="font-bold">{sourceCount}</span>
            </div>
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700/50 text-slate-300">
              <span>Reddit posts/wk</span>
              <span className="font-bold">{weeklyPosts.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700/50 text-slate-300">
              <span>Quality Score</span>
              <span className={cn('font-bold', isGrounded ? 'text-emerald-400' : 'text-amber-400')}>{quality}</span>
            </div>
          </div>
          <span className={cn(
            'text-xs font-semibold',
            isGrounded ? 'text-emerald-400' : 'text-amber-400'
          )}>
            {isGrounded ? '✓ Real signals' : '⚡ AI estimation'}
          </span>
        </CardContent>
      </Card>

      {/* ── Card 4: Best Format ── */}
      <Card className="relative overflow-hidden border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-800/60 backdrop-blur-sm shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
        <CardContent className="flex flex-col items-center justify-center gap-3 py-6 px-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
            <Layers className="w-3.5 h-3.5" />
            Best Format
          </div>
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-400">
            {formatIcon}
          </div>
          <p className="text-base font-bold text-white capitalize">{bestType}</p>
          <p className="text-xs text-slate-400 text-center leading-relaxed">{formatAdvantage}</p>
          <Button
            size="sm"
            onClick={() => onGenerateNow(bestType)}
            className="w-full mt-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-500/20 transition-all duration-200 hover:shadow-blue-500/40 hover:-translate-y-0.5"
          >
            Generate {bestType.charAt(0).toUpperCase() + bestType.slice(1)} →
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default SignalIntelligenceRow;
