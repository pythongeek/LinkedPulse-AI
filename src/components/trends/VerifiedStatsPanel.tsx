import React, { useState } from 'react';
import {
  Shield,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  Database,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface VerifiedStatsPanelProps {
  research: any; // TopicResearchResult
}

// ─── Credibility tiers ────────────────────────────────────────────────────────
const CREDIBILITY_CONFIG: Record<string, {
  label: string;
  badge: string;
  rank: number;
}> = {
  HIGH: {
    label: 'HIGH',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    rank: 3,
  },
  MEDIUM: {
    label: 'MEDIUM',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    rank: 2,
  },
  LOW: {
    label: 'LOW',
    badge: 'bg-slate-600/40 text-slate-400 border-slate-500/30',
    rank: 1,
  },
};

function getCredibility(stat: any): string {
  const tier = (
    stat.credibilityTier ?? stat.credibility ?? stat.tier ?? 'MEDIUM'
  ).toUpperCase();
  return Object.keys(CREDIBILITY_CONFIG).includes(tier) ? tier : 'MEDIUM';
}

// ─── Single stat card ─────────────────────────────────────────────────────────
interface StatItemProps {
  stat: any;
}

function StatItem({ stat }: StatItemProps) {
  const [copied, setCopied] = useState(false);

  const credibility = getCredibility(stat);
  const config = CREDIBILITY_CONFIG[credibility];

  const fact: string = stat.fact ?? stat.statistic ?? stat.text ?? '';
  const source: string = stat.source ?? stat.sourceUrl ?? '';
  const sourceLabel: string = stat.sourceLabel ?? stat.sourceName ?? new URL(source.startsWith('http') ? source : 'https://example.com' + source).hostname.replace('www.', '');
  const isStaleness: boolean = stat.mightBeOld ?? stat.isStaleness ?? false;

  function handleCopy() {
    navigator.clipboard.writeText(fact).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="group relative rounded-xl border border-white/10 bg-gradient-to-br from-slate-800/60 to-slate-900/40 p-4 hover:border-white/20 hover:bg-slate-800/80 transition-all duration-200 space-y-3">
      {/* top row: credibility + staleness */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-widest',
          config.badge
        )}>
          <CheckCircle2 className="w-3 h-3" />
          {config.label}
        </span>
        {isStaleness && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3" />
            May be outdated
          </span>
        )}
      </div>

      {/* Fact text */}
      <p className="text-sm font-semibold text-white leading-snug">{fact}</p>

      {/* Source link */}
      {source && (
        <a
          href={source.startsWith('http') ? source : `https://${source}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors group/link"
        >
          <ExternalLink className="w-3 h-3 group-hover/link:scale-110 transition-transform" />
          {sourceLabel}
        </a>
      )}

      {/* Copy button */}
      <div className="pt-1 border-t border-white/5">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCopy}
          className={cn(
            'h-7 px-2.5 text-xs font-medium transition-all duration-200',
            copied
              ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/10'
          )}
        >
          {copied ? (
            <><Check className="w-3.5 h-3.5 mr-1.5" />Copied to clipboard!</>
          ) : (
            <><Copy className="w-3.5 h-3.5 mr-1.5" />Use this stat</>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function VerifiedStatsPanel({ research }: VerifiedStatsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const PREVIEW_COUNT = 4;

  const raw: any[] = research?.verifiedStatistics
    ?? research?.statistics
    ?? research?.verifiedStats
    ?? [];

  // Sort: HIGH first, then MEDIUM, then LOW
  const sorted = [...raw].sort((a, b) => {
    const ra = CREDIBILITY_CONFIG[getCredibility(a)]?.rank ?? 0;
    const rb = CREDIBILITY_CONFIG[getCredibility(b)]?.rank ?? 0;
    return rb - ra;
  });

  const visible = expanded ? sorted : sorted.slice(0, PREVIEW_COUNT);
  const hasMore = sorted.length > PREVIEW_COUNT;
  const count = sorted.length;

  return (
    <Card className="relative overflow-hidden border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-800/70 backdrop-blur-sm shadow-xl">
      <div className="h-0.5 w-full bg-gradient-to-r from-emerald-500 via-blue-500 to-violet-500 opacity-60" />

      <CardHeader className="pb-3 pt-4 px-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Title */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30">
              <Shield className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Verified Statistics</h3>
              <p className="text-[10px] text-slate-500">Sourced · grounded · ready to use</p>
            </div>
          </div>

          {/* Count badge */}
          {count > 0 && (
            <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold text-xs px-2.5 py-0.5">
              {count} {count === 1 ? 'stat' : 'stats'}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5 space-y-3">
        {/* ─── Stats list ─── */}
        {count === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-white/10 flex items-center justify-center mb-3">
              <Database className="w-5 h-5 text-slate-500" />
            </div>
            <p className="text-sm font-medium text-slate-400 mb-1">No verified statistics found</p>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              Try switching to <span className="text-blue-400 font-semibold">Deep research</span> mode to unlock real data points from authoritative sources.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {visible.map((stat, i) => (
                <StatItem key={stat.id ?? `stat-${i}`} stat={stat} />
              ))}
            </div>

            {/* Show more / collapse */}
            {hasMore && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded((v) => !v)}
                className="w-full text-xs text-slate-400 hover:text-white hover:bg-white/5 border border-white/5 hover:border-white/15 transition-all gap-2"
              >
                {expanded ? (
                  <><ChevronUp className="w-3.5 h-3.5" />Show fewer</>
                ) : (
                  <><ChevronDown className="w-3.5 h-3.5" />Show {sorted.length - PREVIEW_COUNT} more stats</>
                )}
              </Button>
            )}
          </>
        )}

        {/* Credibility legend */}
        {count > 0 && (
          <div className="pt-3 border-t border-white/5 flex items-center gap-4 flex-wrap">
            <p className="text-[10px] text-slate-600 uppercase tracking-widest font-semibold">Credibility:</p>
            {(['HIGH', 'MEDIUM', 'LOW'] as const).map((tier) => (
              <span
                key={tier}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border',
                  CREDIBILITY_CONFIG[tier].badge
                )}
              >
                {tier}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default VerifiedStatsPanel;
