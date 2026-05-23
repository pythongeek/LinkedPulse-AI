import React from 'react';
import {
  MessageSquare,
  ThumbsUp,
  Minus,
  ThumbsDown,
  HelpCircle,
  AlertCircle,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CommunitySignalPanelProps {
  research: any; // TopicResearchResult
  onTopicClick: (topic: string) => void;
}

// ─── Sentiment config ─────────────────────────────────────────────────────────
function useSentimentConfig(sentiment?: string) {
  const s = (sentiment ?? '').toLowerCase();
  if (s === 'positive' || s === 'bullish') {
    return { color: 'text-emerald-400', bg: 'bg-emerald-500', icon: <ThumbsUp className="w-3.5 h-3.5" />, label: 'Positive' };
  }
  if (s === 'negative' || s === 'bearish') {
    return { color: 'text-red-400', bg: 'bg-red-500', icon: <ThumbsDown className="w-3.5 h-3.5" />, label: 'Negative' };
  }
  return { color: 'text-slate-400', bg: 'bg-slate-500', icon: <Minus className="w-3.5 h-3.5" />, label: 'Neutral' };
}

// ─── Severity dot ─────────────────────────────────────────────────────────────
function SeverityDots({ severity }: { severity?: string }) {
  const map: Record<string, string> = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-slate-500' };
  const s = (severity ?? 'low').toLowerCase();
  const count = s === 'high' ? 3 : s === 'medium' ? 2 : 1;
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn(
            'w-1.5 h-1.5 rounded-full transition-all',
            i <= count ? map[s] : 'bg-slate-700'
          )}
        />
      ))}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function CommunitySignalPanel({ research, onTopicClick }: CommunitySignalPanelProps) {
  const signal = research?.redditSignal ?? {};
  const weeklyPosts: number = signal.weeklyPostCount ?? 0;
  const sentiment: string = signal.overallSentiment ?? research?.communitySignal?.sentiment ?? '';
  const isReal: boolean = research?.isFullyGrounded ?? false;

  const sentConfig = useSentimentConfig(sentiment);

  const hotAngles: string[] = signal.hotAngles ?? research?.communitySignal?.hotAngles ?? [];
  const painPoints: { point: string; severity?: string }[] =
    signal.painPoints ?? research?.communitySignal?.painPoints ?? [];
  const unansweredQuestions: string[] =
    signal.unansweredQuestions ?? research?.communitySignal?.unansweredQuestions ?? [];

  return (
    <Card className="relative overflow-hidden border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-800/70 backdrop-blur-sm shadow-xl">
      {/* Sentiment color bar */}
      <div className={cn('h-0.5 w-full', sentConfig.bg, 'opacity-70')} />

      <CardHeader className="pb-3 pt-4 px-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Title */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/30">
              <MessageSquare className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Community Signals</h3>
              <p className="text-[10px] text-slate-500">Reddit intelligence</p>
            </div>
          </div>

          {/* Real / Estimated badge */}
          <Badge className={cn(
            'text-xs font-semibold border',
            isReal
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              : 'bg-amber-500/15  text-amber-300  border-amber-500/30'
          )}>
            {isReal ? '✓ Real data' : '⚡ AI estimated'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5 space-y-5">
        {/* ─── KPI pills ─── */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Post volume */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-white/8">
            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-400">Posts/wk:</span>
            <span className="text-xs font-bold text-white">{weeklyPosts.toLocaleString()}</span>
          </div>

          {/* Sentiment */}
          {sentiment && (
            <div className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold',
              sentConfig.color,
              sentConfig.bg + '/10',
              sentConfig.bg.replace('bg-', 'border-') + '/30'
            )}>
              {sentConfig.icon}
              {sentConfig.label}
            </div>
          )}
        </div>

        {/* ─── Hot Angles ─── */}
        {hotAngles.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest">Hot Angles</p>
            </div>
            <ul className="space-y-1.5">
              {hotAngles.map((angle, i) => (
                <li key={i}>
                  <button
                    onClick={() => onTopicClick(angle)}
                    className="group flex items-center gap-2.5 w-full text-left p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-white/5 hover:border-orange-500/30 transition-all duration-200"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0 group-hover:scale-125 transition-transform" />
                    <span className="text-xs text-slate-300 group-hover:text-white transition-colors flex-1 leading-snug">
                      {angle}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-600 group-hover:text-orange-400 transition-colors shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ─── Pain Points ─── */}
        {painPoints.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest">Pain Points</p>
            </div>
            <ul className="space-y-2">
              {painPoints.map((item, i) => {
                const point = typeof item === 'string' ? item : item.point;
                const severity = typeof item === 'string' ? undefined : item.severity;
                return (
                  <li key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-red-500/5 border border-red-500/15">
                    <SeverityDots severity={severity} />
                    <p className="text-xs text-slate-300 leading-snug flex-1">{point}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* ─── Unanswered Questions ─── */}
        {unansweredQuestions.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest">Unanswered Questions</p>
            </div>
            <ul className="space-y-2">
              {unansweredQuestions.map((q, i) => (
                <li
                  key={i}
                  className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/15"
                >
                  <p className="text-xs text-slate-300 leading-snug flex-1 italic">"{q}"</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onTopicClick(q)}
                    className="shrink-0 h-6 px-2 text-[10px] text-blue-400 hover:text-white hover:bg-blue-500/20 transition-all whitespace-nowrap"
                  >
                    Turn into post →
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Empty state */}
        {hotAngles.length === 0 && painPoints.length === 0 && unansweredQuestions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-xs text-slate-500">No community signals found for this topic.</p>
            <p className="text-xs text-slate-600 mt-1">Try Deep research mode for richer data.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CommunitySignalPanel;
